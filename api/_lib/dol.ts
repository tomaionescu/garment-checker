// Apparel-related rows of the US Department of Labor "List of Goods Produced by
// Child Labor or Forced Labor", edition of 5 September 2024.
// Source: https://www.dol.gov/agencies/ilab/reports/child-labor/list-of-goods
// The list is updated every two years; refresh this file when a new edition is out.

export const DOL_EDITION = "2024";

// [ISO 3166-1 alpha-2, good, child labour, forced labour]
// "Inputs produced with forced labour" rows count as forced labour.
const ROWS: [string, string, boolean, boolean][] = [
    ["AR", "Cotton", true, false],
    ["AZ", "Cotton", true, false],
    ["BJ", "Cotton", true, true],
    ["BR", "Cotton", true, false],
    ["BF", "Cotton", true, true],
    ["CN", "Cotton", true, true],
    ["EG", "Cotton", true, false],
    ["IN", "Cotton", true, false],
    ["KZ", "Cotton", true, true],
    ["KG", "Cotton", true, false],
    ["ML", "Cotton", true, false],
    ["PK", "Cotton", false, true],
    ["TJ", "Cotton", true, true],
    ["TR", "Cotton", true, false],
    ["TM", "Cotton", true, true],
    ["ZM", "Cotton", true, false],
    ["IN", "Embellished textiles", true, true],
    ["NP", "Embellished textiles", true, true],
    ["BD", "Footwear", true, false],
    ["BR", "Footwear", true, false],
    ["CN", "Footwear", false, true],
    ["IN", "Footwear", true, false],
    ["TR", "Footwear", true, false],
    ["VN", "Footwear", true, false],
    ["ID", "Footwear", true, false],
    ["AR", "Garments", true, true],
    ["BD", "Garments", true, true],
    ["BR", "Garments", false, true],
    ["MM", "Garments", true, true],
    ["CN", "Garments", false, true],
    ["IN", "Garments", true, true],
    ["MY", "Garments", false, true],
    ["MU", "Garments", false, true],
    ["MX", "Garments", true, false],
    ["PK", "Garments", true, false],
    ["TH", "Garments", true, true],
    ["TR", "Garments", true, false],
    ["VN", "Garments", true, true],
    ["BD", "Jute textiles", true, false],
    ["BD", "Leather", true, false],
    ["PK", "Leather", true, false],
    ["VN", "Leather", true, false],
    ["IN", "Leather goods", true, false],
    ["MX", "Leather goods", true, false],
    ["UZ", "Silk cocoons", false, true],
    ["IN", "Silk fabric", true, false],
    ["IN", "Silk thread", true, false],
    ["BD", "Textiles", true, false],
    ["KH", "Textiles", true, false],
    ["CN", "Textiles", true, true],
    ["GH", "Textiles", true, false],
    ["KP", "Textiles", false, true],
    ["PK", "Textiles", true, false],
    ["VN", "Textiles", true, false],
    ["ET", "Hand-woven textiles", true, true],
    ["CN", "Thread and yarn", false, true],
    ["IN", "Thread and yarn", true, true],
];

export interface LabourEntry {
    good: string;
    childLabour: boolean;
    forcedLabour: boolean;
}

/**
 * Rows of the list that apply to a garment made in `country`.
 * Garment, textile and yarn rows always apply. Raw-material rows (cotton, silk,
 * leather, jute) only apply when the label lists that fibre, and footwear rows
 * only for footwear, which this app does not scan.
 */
export function labourEntries(country: string, fibreNames: string[]): LabourEntry[] {
    const fibres = fibreNames.join(" ").toLowerCase();
    return ROWS.filter(([code, good]) => {
        if (code !== country.toUpperCase()) return false;
        const g = good.toLowerCase();
        if (g.startsWith("footwear")) return false;
        const rawMaterial = ["cotton", "silk", "leather", "jute"].find((m) => g.startsWith(m));
        return !rawMaterial || fibres.includes(rawMaterial);
    }).map(([, good, childLabour, forcedLabour]) => ({ good, childLabour, forcedLabour }));
}
