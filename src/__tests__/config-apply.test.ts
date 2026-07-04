import { describe, it, expect } from "vitest";
import {
  isReservedFieldKey,
  classifyFieldSource,
  slugify,
  isValidSlug,
  keyify,
  isValidTypeKey,
  camelToSnake,
  RESERVED_FIELD_KEYS,
} from "@/lib/config-apply";

describe("config-apply pure helpers", () => {
  describe("reserved-key validation", () => {
    it("rejects every reserved server-managed key", () => {
      for (const key of ["id", "typeKey", "createdAt", "updatedAt", "customFields"]) {
        expect(isReservedFieldKey(key)).toBe(true);
        expect(RESERVED_FIELD_KEYS.has(key)).toBe(true);
      }
    });

    it("does not treat ordinary keys as reserved", () => {
      expect(isReservedFieldKey("name")).toBe(false);
      expect(isReservedFieldKey("owner")).toBe(false);
      expect(isReservedFieldKey("myCustomField")).toBe(false);
    });
  });

  describe("classifyFieldSource", () => {
    it("returns null for reserved keys", () => {
      expect(classifyFieldSource("typeKey")).toBeNull();
      expect(classifyFieldSource("customFields")).toBeNull();
    });

    it("classifies known built-in columns as builtin", () => {
      expect(classifyFieldSource("name")).toBe("builtin");
      expect(classifyFieldSource("lifecycle")).toBe("builtin");
      expect(classifyFieldSource("owner")).toBe("builtin");
    });

    it("classifies unknown keys as custom", () => {
      expect(classifyFieldSource("riskScore")).toBe("custom");
      expect(classifyFieldSource("vendorRating")).toBe("custom");
    });
  });

  describe("slugify + isValidSlug", () => {
    it("lowercases and hyphenates", () => {
      expect(slugify("Business Capability")).toBe("business-capability");
      expect(slugify("  Data Object!! ")).toBe("data-object");
      expect(slugify("API_Endpoints")).toBe("api-endpoints");
    });

    it("collapses runs and trims stray hyphens", () => {
      expect(slugify("a---b   c")).toBe("a-b-c");
      expect(slugify("--edge--")).toBe("edge");
    });

    it("validates well-formed slugs", () => {
      expect(isValidSlug("business-capability")).toBe(true);
      expect(isValidSlug("app")).toBe(true);
      expect(isValidSlug("a1-b2")).toBe(true);
    });

    it("rejects malformed slugs", () => {
      expect(isValidSlug("Business-Capability")).toBe(false);
      expect(isValidSlug("-leading")).toBe(false);
      expect(isValidSlug("trailing-")).toBe(false);
      expect(isValidSlug("double--hyphen")).toBe(false);
      expect(isValidSlug("")).toBe(false);
      expect(isValidSlug("has space")).toBe(false);
    });
  });

  describe("keyify + isValidTypeKey", () => {
    it("produces camelCase machine keys", () => {
      expect(keyify("Business Capability")).toBe("businessCapability");
      expect(keyify("Data Object")).toBe("dataObject");
      expect(keyify("app")).toBe("app");
    });

    it("validates type keys", () => {
      expect(isValidTypeKey("businessCapability")).toBe(true);
      expect(isValidTypeKey("app_v2")).toBe(true);
      expect(isValidTypeKey("2fast")).toBe(false); // must start with a letter
      expect(isValidTypeKey("has-hyphen")).toBe(false);
      expect(isValidTypeKey("has space")).toBe(false);
    });
  });

  describe("camelToSnake", () => {
    it("maps built-in field keys to their DB column names", () => {
      expect(camelToSnake("technicalFit")).toBe("technical_fit");
      expect(camelToSnake("endOfLife")).toBe("end_of_life");
      expect(camelToSnake("name")).toBe("name");
      expect(camelToSnake("sixRClassification")).toBe("six_r_classification");
    });
  });
});
