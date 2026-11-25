import { test } from "node:test";
import * as assert from "node:assert/strict";
import { labourEntries } from "./dol.js";
import { ecobalyseQuery, matchContributor } from "./sources.js";
import type { Label } from "./label.js";

const label = (over: Partial<Label>): Label => ({
    readable: true, garmentType: "tshirt", brand: null, madeIn: "BD", rn: null, ca: null, certifications: [],
    fibres: [{ name: "Cotton", share: 100, material: "cotton" }],
    care: { maxWashTempC: null, tumbleDry: null, iron: null, bleach: null, dryClean: null },
    ...over,
});

test("labour rows: garment rows always apply, raw-material rows only with that fibre", () => {
    assert.deepEqual(labourEntries("in", ["Polyester"]).map((e) => e.good),
        ["Embellished textiles", "Garments", "Thread and yarn"]);
    assert.ok(labourEntries("IN", ["Organic cotton"]).some((e) => e.good === "Cotton"));
    assert.deepEqual(labourEntries("BD", []).find((e) => e.good === "Garments"),
        { good: "Garments", childLabour: true, forcedLabour: true });
    assert.deepEqual(labourEntries("FR", ["Cotton"]), []);
});

test("ecobalyse query: merges duplicate fibres and only sends modelled countries", () => {
    const built = ecobalyseQuery(label({
        madeIn: "LK",
        fibres: [
            { name: "Cotton", share: 60, material: "cotton" },
            { name: "Combed cotton", share: 35, material: "cotton" },
            { name: "Spandex", share: 5, material: "elastane" },
        ],
    }));
    assert.ok(!("status" in built));
    assert.equal(built.countryModelled, false);
    assert.deepEqual(built.query, {
        mass: 0.15,
        product: "tshirt",
        materials: [
            { id: "ei-coton", share: 0.95 },
            { id: "elasthane", share: 0.05 },
        ],
    });
    const modelled = ecobalyseQuery(label({}));
    assert.ok(!("status" in modelled) && (modelled.query as { countryMaking?: string }).countryMaking === "BD");
});

test("ecobalyse query: refuses what it cannot model instead of guessing", () => {
    const reason = (l: Label) => (ecobalyseQuery(l) as { reason: string }).reason;
    assert.equal(reason(label({ garmentType: null })), "unsupported_garment");
    assert.equal(reason(label({ fibres: [] })), "no_composition");
    assert.equal(reason(label({ fibres: [{ name: "Silk", share: 100, material: null }] })), "unsupported_fibre");
    assert.equal(reason(label({ fibres: [{ name: "Cotton", share: 60, material: "cotton" }] })), "no_composition");
});

test("contributor match: exact brand name first, never a service provider", () => {
    const list: [number, string, string][] = [
        [1, "Zara Audits Ltd", "Service Provider"],
        [2, "H&M Group", "Brand / Retailer"],
        [3, "H&M", "Brand / Retailer"],
    ];
    assert.deepEqual(matchContributor("h&m", list), [3, "H&M"]);
    assert.equal(matchContributor("Zara", list), null);
    assert.equal(matchContributor("", list), null);
});
