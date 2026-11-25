import type { Label } from "./label.js";

// Live reference sources. Each returns { status: "unavailable", reason }
// instead of throwing, so a missing token or an outage never fails the whole analysis.

export type Unavailable = { status: "unavailable"; reason: string };

// ---------------------------------------------------------------- Ecobalyse
// French government life-cycle model for textiles. The current API needs an
// account token, but the released v7.0.0 (July 2025) is still hosted and returns
// the aggregate environmental cost without one, so that release is used here.
// API reference: https://ecobalyse.beta.gouv.fr/versions/v7.0.0/#/api

const ECOBALYSE = "https://ecobalyse.beta.gouv.fr/versions/v7.0.0/api/textile/simulator";

const ECOBALYSE_MATERIAL_IDS: Record<string, string> = {
    "cotton": "ei-coton",
    "organic-cotton": "ei-coton-organic",
    // Ecobalyse splits recycled cotton by waste source; labels do not, so use post-consumer.
    "recycled-cotton": "coton-rdpc",
    "polyester": "ei-pet",
    "recycled-polyester": "ei-pet-r",
    "elastane": "elasthane",
    "nylon": "ei-pa",
    "acrylic": "ei-acrylique",
    "viscose": "ei-viscose",
    "linen": "ei-lin",
    "hemp": "ei-chanvre",
    "jute": "ei-jute-kenaf",
    "wool": "ei-laine-par-defaut",
    "polypropylene": "ei-pp",
};

// Finished-garment masses (kg) from Ecobalyse's own default examples. A label
// never states the weight, so the result is for a typical garment of that type.
const TYPICAL_MASS_KG: Record<string, number> = {
    "tshirt": 0.15, "chemise": 0.25, "pull": 0.55, "jean": 0.45, "pantalon": 0.45, "jupe": 0.3,
    "manteau": 0.95, "chaussettes": 0.04, "calecon": 0.04, "slip": 0.03, "maillot-de-bain": 0.1,
};

// Countries Ecobalyse models individually. For any other country the making
// step is left out of the query and Ecobalyse applies its default (worst case).
const ECOBALYSE_COUNTRIES = new Set(["MM", "BD", "CN", "FR", "IN", "KH", "MA", "PK", "TN", "TR", "VN"]);

export type Environment = Unavailable | {
    status: "ok";
    /** Environmental cost in impact points (lower is better). */
    ecs: number;
    massKg: number;
    countryModelled: boolean;
    webUrl: string | null;
};

/** Builds the Ecobalyse query for a label, or the reason it cannot be modelled. */
export function ecobalyseQuery(label: Label): { query: object; massKg: number; countryModelled: boolean } | Unavailable {
    if (!label.garmentType) return { status: "unavailable", reason: "unsupported_garment" };
    if (label.fibres.length === 0) return { status: "unavailable", reason: "no_composition" };
    if (label.fibres.some((f) => !f.material)) return { status: "unavailable", reason: "unsupported_fibre" };
    const total = label.fibres.reduce((sum, f) => sum + f.share, 0);
    if (Math.abs(total - 100) > 1) return { status: "unavailable", reason: "no_composition" };

    // The same category can appear twice on a label ("cotton", "combed cotton"); Ecobalyse wants it once.
    const shares = new Map<string, number>();
    for (const f of label.fibres) {
        const id = ECOBALYSE_MATERIAL_IDS[f.material as string];
        shares.set(id, (shares.get(id) ?? 0) + f.share / total);
    }
    const massKg = TYPICAL_MASS_KG[label.garmentType];
    const countryModelled = !!label.madeIn && ECOBALYSE_COUNTRIES.has(label.madeIn);
    return {
        massKg,
        countryModelled,
        query: {
            mass: massKg,
            product: label.garmentType,
            materials: [...shares].map(([id, share]) => ({ id, share: Math.round(share * 1000) / 1000 })),
            ...(countryModelled ? { countryMaking: label.madeIn } : {}),
        },
    };
}

export async function environmentalCost(label: Label): Promise<Environment> {
    const built = ecobalyseQuery(label);
    if ("status" in built) return built;
    try {
        const res = await fetch(ECOBALYSE, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(built.query),
            signal: AbortSignal.timeout(20_000),
        });
        if (!res.ok) throw new Error(`Ecobalyse responded ${res.status}: ${await res.text()}`);
        const body = await res.json() as { impacts?: { ecs?: number }; webUrl?: string };
        if (typeof body.impacts?.ecs !== "number") throw new Error("Ecobalyse response has no ecs impact");
        return {
            status: "ok",
            ecs: Math.round(body.impacts.ecs),
            massKg: built.massKg,
            countryModelled: built.countryModelled,
            webUrl: body.webUrl ?? null,
        };
    } catch (error) {
        console.error("Ecobalyse lookup failed", error);
        return { status: "unavailable", reason: "error" };
    }
}

// ---------------------------------------------------------- Open Supply Hub
// Open registry of production facilities, contributed by brands and auditors.
// API reference: https://opensupplyhub.org/api/docs/

export type Factories = Unavailable | {
    status: "ok";
    /** Name of the brand as registered on Open Supply Hub. */
    contributor: string;
    count: number;
    sample: { name: string; address: string; osId: string }[];
};

const OSH = "https://opensupplyhub.org/api";

/** Picks the Open Supply Hub contributor that is this brand, if it has one. */
export function matchContributor(brand: string, contributors: [number, string, string][]): [number, string] | null {
    const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    const wanted = norm(brand);
    if (!wanted) return null;
    const brands = contributors.filter(([, , type]) => /brand|retailer/i.test(type));
    const hit = brands.find(([, name]) => norm(name) === wanted) ??
        brands.find(([, name]) => norm(name).startsWith(wanted + " "));
    return hit ? [hit[0], hit[1]] : null;
}

// The contributor list is a few thousand rows and rarely changes: keep it for the life of the instance.
let contributorsCache: Promise<[number, string, string][]> | undefined;

/** Factories the brand has disclosed in the country printed on the label. */
export async function knownFactories(label: Label, token: string | undefined): Promise<Factories> {
    if (!token) return { status: "unavailable", reason: "no_token" };
    if (!label.brand) return { status: "unavailable", reason: "no_brand" };
    if (!label.madeIn) return { status: "unavailable", reason: "no_country" };
    const get = async <T>(path: string): Promise<T> => {
        const res = await fetch(OSH + path, {
            headers: { Authorization: `Token ${token}` },
            signal: AbortSignal.timeout(20_000),
        });
        if (!res.ok) throw new Error(`Open Supply Hub responded ${res.status} for ${path}`);
        return res.json() as Promise<T>;
    };
    try {
        contributorsCache ??= get<[number, string, string][]>("/contributors/");
        const match = matchContributor(label.brand, await contributorsCache);
        if (!match) return { status: "unavailable", reason: "brand_not_listed" };
        const [id, contributor] = match;
        const result = await get<{
            count: number;
            features: { properties: { name: string; address: string; os_id: string } }[];
        }>(`/facilities/?contributors=${id}&countries=${label.madeIn}&pageSize=5`);
        return {
            status: "ok",
            contributor,
            count: result.count,
            sample: result.features.map(({ properties: p }) => ({ name: p.name, address: p.address, osId: p.os_id })),
        };
    } catch (error) {
        contributorsCache = undefined;
        console.error("Open Supply Hub lookup failed", error);
        return { status: "unavailable", reason: "error" };
    }
}
