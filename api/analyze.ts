import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { IMAGE_TYPES, readLabel } from "./_lib/label.js";
import { DOL_EDITION, labourEntries } from "./_lib/dol.js";
import { environmentalCost, knownFactories } from "./_lib/sources.js";

// POST /api/analyze  { images: [{ contentType, data (base64) }] }
// Reads the label in the photos and checks it against the reference sources.
// The caller must send a Firebase ID token; saving the result is up to the client.

export const config = { maxDuration: 60 };

const FIREBASE_PROJECT = "garment-checker";
const MAX_IMAGES = 4;
const MAX_BASE64_CHARS = 1_400_000; // about 1 MB per photo; the client downsizes before sending

const firebaseKeys = createRemoteJWKSet(
    new URL("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"),
);

async function signedIn(request: VercelRequest): Promise<boolean> {
    const token = request.headers.authorization?.replace(/^Bearer /, "");
    if (!token) return false;
    try {
        const { payload } = await jwtVerify(token, firebaseKeys, {
            issuer: `https://securetoken.google.com/${FIREBASE_PROJECT}`,
            audience: FIREBASE_PROJECT,
        });
        return !!payload.sub;
    } catch {
        return false;
    }
}

type Image = { data: Buffer; contentType: typeof IMAGE_TYPES[number] };

function parseImages(body: unknown): Image[] | null {
    const images = (body as { images?: unknown })?.images;
    if (!Array.isArray(images) || images.length === 0 || images.length > MAX_IMAGES) return null;
    const parsed: Image[] = [];
    for (const image of images) {
        const contentType = IMAGE_TYPES.find((type) => type === image?.contentType);
        if (!contentType || typeof image.data !== "string" || image.data.length > MAX_BASE64_CHARS) return null;
        parsed.push({ contentType, data: Buffer.from(image.data, "base64") });
    }
    return parsed;
}

export default async function handler(request: VercelRequest, response: VercelResponse) {
    if (request.method !== "POST") return response.status(405).json({ error: "method-not-allowed" });
    if (!(await signedIn(request))) return response.status(401).json({ error: "unauthenticated" });

    const images = parseImages(request.body);
    if (!images) return response.status(400).json({ error: "invalid-argument" });

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
        console.error("ANTHROPIC_API_KEY is not set");
        return response.status(500).json({ error: "internal" });
    }

    let label;
    try {
        label = await readLabel(apiKey, images);
    } catch (error) {
        console.error("Label reading failed", error);
        return response.status(500).json({ error: "internal" });
    }

    const [environment, factories] = await Promise.all([
        environmentalCost(label),
        knownFactories(label, process.env.OPEN_SUPPLY_HUB_TOKEN),
    ]);
    const labour = label.madeIn ? {
        edition: DOL_EDITION,
        entries: labourEntries(label.madeIn, label.fibres.map((f) => f.name)),
    } : null;

    return response.status(200).json({ version: 2, label, environment, labour, factories });
}
