import Anthropic from "@anthropic-ai/sdk";

// The model only transcribes what is printed on the tag. Every judgement about
// the garment comes from the reference sources in sources.ts, never from here.

export const GARMENT_TYPES = [
    "tshirt", "chemise", "pull", "jean", "pantalon", "jupe", "manteau",
    "chaussettes", "calecon", "slip", "maillot-de-bain",
] as const;

export const MATERIALS = [
    "cotton", "organic-cotton", "recycled-cotton", "polyester", "recycled-polyester",
    "elastane", "nylon", "acrylic", "viscose", "linen", "hemp", "jute", "wool", "polypropylene",
] as const;

export interface Label {
    readable: boolean;
    garmentType: typeof GARMENT_TYPES[number] | null;
    brand: string | null;
    madeIn: string | null;
    fibres: { name: string; share: number; material: typeof MATERIALS[number] | null }[];
    rn: string | null;
    ca: string | null;
    certifications: string[];
    care: {
        maxWashTempC: number | null;
        tumbleDry: boolean | null;
        iron: boolean | null;
        bleach: boolean | null;
        dryClean: boolean | null;
    };
}

const nullable = (type: string, extra: object = {}) => ({ anyOf: [{ type, ...extra }, { type: "null" }] });

const SCHEMA = {
    type: "object",
    additionalProperties: false,
    required: ["readable", "garmentType", "brand", "madeIn", "fibres", "rn", "ca", "certifications", "care"],
    properties: {
        readable: { type: "boolean" },
        garmentType: nullable("string", { enum: [...GARMENT_TYPES] }),
        brand: nullable("string"),
        madeIn: nullable("string"),
        fibres: {
            type: "array",
            items: {
                type: "object",
                additionalProperties: false,
                required: ["name", "share", "material"],
                properties: {
                    name: { type: "string" },
                    share: { type: "number" },
                    material: nullable("string", { enum: [...MATERIALS] }),
                },
            },
        },
        rn: nullable("string"),
        ca: nullable("string"),
        certifications: { type: "array", items: { type: "string" } },
        care: {
            type: "object",
            additionalProperties: false,
            required: ["maxWashTempC", "tumbleDry", "iron", "bleach", "dryClean"],
            properties: {
                maxWashTempC: nullable("number"),
                tumbleDry: nullable("boolean"),
                iron: nullable("boolean"),
                bleach: nullable("boolean"),
                dryClean: nullable("boolean"),
            },
        },
    },
};

const PROMPT = `You transcribe clothing labels. The photos show one garment: its care/composition label and possibly the garment itself.

Report only what is printed or plainly visible. Never guess: use null (or an empty list) for anything you cannot read.

- readable: false if no composition or origin label can be read in any photo.
- garmentType: the closest category, from the garment photo or the label. tshirt covers polos, chemise is a shirt or blouse, pull is knitwear or a sweatshirt, pantalon covers shorts, jupe covers dresses, manteau covers jackets, calecon is woven boxers, slip is knitted underwear, maillot-de-bain is swimwear. null if it is none of these.
- brand: the brand name as printed, or null.
- madeIn: ISO 3166-1 alpha-2 code of the "Made in" country, or null.
- fibres: every fibre of the main fabric with its percentage (0-100). name is the fibre in English as printed (for example "Merino wool"). material is the matching category, or null if none fits (silk, cashmere, lyocell, modal and so on are null). Spandex and Lycra are elastane, polyamide is nylon, rayon is viscose. Only use organic or recycled categories when the label says so.
- rn / ca: digits of the RN or CA registration number, or null.
- certifications: certification marks printed on the label (GOTS, OEKO-TEX, Fairtrade and so on).
- care: read the care symbols and text. maxWashTempC is the machine-wash temperature in Celsius, 0 for hand wash only, null if washing is not shown. The booleans are true when allowed, false when crossed out, null when not shown.`;

export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;

export async function readLabel(
    apiKey: string,
    images: { data: Buffer; contentType: typeof IMAGE_TYPES[number] }[],
): Promise<Label> {
    const client = new Anthropic({ apiKey });
    const response = await client.beta.messages.create({
        model: "claude-opus-5-5",
        max_tokens: 4000,
        // If the model declines a photo, the API retries on a fallback model in the same call.
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        output_config: { effort: "low", format: { type: "json_schema", schema: SCHEMA } },
        messages: [{
            role: "user",
            content: [
                ...images.map((image) => ({
                    type: "image" as const,
                    source: { type: "base64" as const, media_type: image.contentType, data: image.data.toString("base64") },
                })),
                { type: "text", text: PROMPT },
            ],
        }],
    });

    if (response.stop_reason !== "end_turn") throw new Error(`Label reading stopped early: ${response.stop_reason}`);
    const text = response.content.find((block) => block.type === "text");
    if (!text || text.type !== "text") throw new Error("The model returned no label data");
    const label = JSON.parse(text.text) as Label;
    label.madeIn = label.madeIn && /^[A-Za-z]{2}$/.test(label.madeIn) ? label.madeIn.toUpperCase() : null;
    return label;
}
