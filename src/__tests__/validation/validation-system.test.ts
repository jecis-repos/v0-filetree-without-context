/**
 * Comprehensive Validation System Tests
 * Verifies all validation functionality works correctly
 */

import { validate, createValidator, type Schema } from "../../utils/validation"
import { safeJsonParse, safeStringify, deepEqual, deepClone } from "../../utils/json-utils"
import { isString, isNumber, isBoolean, isObject, isArray, isDate, isJsonValue } from "../../utils/type-guards"

describe("Validation System", () => {
  describe("Type Guards", () => {
    test("should validate strings correctly", () => {
      expect(isString("hello")).toBe(true)
      expect(isString("")).toBe(true)
      expect(isString(123)).toBe(false)
      expect(isString(null)).toBe(false)
      expect(isString(undefined)).toBe(false)
      expect(isString({})).toBe(false)
    })

    test("should validate numbers correctly", () => {
      expect(isNumber(123)).toBe(true)
      expect(isNumber(0)).toBe(true)
      expect(isNumber(-123)).toBe(true)
      expect(isNumber(123.45)).toBe(true)
      expect(isNumber(Number.NaN)).toBe(false) // NaN is not a valid number
      expect(isNumber(Number.POSITIVE_INFINITY)).toBe(false)
      expect(isNumber("123")).toBe(false)
      expect(isNumber(null)).toBe(false)
    })

    test("should validate booleans correctly", () => {
      expect(isBoolean(true)).toBe(true)
      expect(isBoolean(false)).toBe(true)
      expect(isBoolean(0)).toBe(false)
      expect(isBoolean(1)).toBe(false)
      expect(isBoolean("true")).toBe(false)
      expect(isBoolean(null)).toBe(false)
    })

    test("should validate objects correctly", () => {
      expect(isObject({})).toBe(true)
      expect(isObject({ key: "value" })).toBe(true)
      expect(isObject([])).toBe(false) // Arrays are not objects in our definition
      expect(isObject(null)).toBe(false)
      expect(isObject("string")).toBe(false)
      expect(isObject(123)).toBe(false)
    })

    test("should validate arrays correctly", () => {
      expect(isArray([])).toBe(true)
      expect(isArray([1, 2, 3])).toBe(true)
      expect(isArray({})).toBe(false)
      expect(isArray(null)).toBe(false)
      expect(isArray("string")).toBe(false)
    })

    test("should validate dates correctly", () => {
      expect(isDate(new Date())).toBe(true)
      expect(isDate(new Date("2024-01-01"))).toBe(true)
      expect(isDate("2024-01-01")).toBe(false)
      expect(isDate(1234567890)).toBe(false)
      expect(isDate(null)).toBe(false)
    })

    test("should validate JSON values correctly", () => {
      expect(isJsonValue("string")).toBe(true)
      expect(isJsonValue(123)).toBe(true)
      expect(isJsonValue(true)).toBe(true)
      expect(isJsonValue(null)).toBe(true)
      expect(isJsonValue([])).toBe(true)
      expect(isJsonValue({})).toBe(true)
      expect(isJsonValue(undefined)).toBe(false)
      expect(isJsonValue(() => {})).toBe(false)
      expect(isJsonValue(Symbol("test"))).toBe(false)
    })
  })

  describe("Basic Schema Validation", () => {
    test("should validate string schema", () => {
      const schema: Schema = { type: "string", required: true }

      const validResult = validate("hello", schema)
      expect(validResult.isValid).toBe(true)
      expect(validResult.errors).toHaveLength(0)

      const invalidResult = validate(123, schema)
      expect(invalidResult.isValid).toBe(false)
      expect(invalidResult.errors[0].code).toBe("TYPE_MISMATCH")
    })

    test("should validate number schema", () => {
      const schema: Schema = { type: "number", required: true }

      const validResult = validate(123, schema)
      expect(validResult.isValid).toBe(true)

      const invalidResult = validate("123", schema)
      expect(invalidResult.isValid).toBe(false)
    })

    test("should validate boolean schema", () => {
      const schema: Schema = { type: "boolean", required: true }

      const validResult = validate(true, schema)
      expect(validResult.isValid).toBe(true)

      const invalidResult = validate("true", schema)
      expect(invalidResult.isValid).toBe(false)
    })

    test("should validate object schema", () => {
      const schema: Schema = {
        type: "object",
        properties: {
          name: { type: "string", required: true },
          age: { type: "number", required: true },
        },
      }

      const validResult = validate({ name: "John", age: 30 }, schema)
      expect(validResult.isValid).toBe(true)

      const invalidResult = validate({ name: "John" }, schema)
      expect(invalidResult.isValid).toBe(false)
      expect(invalidResult.errors[0].code).toBe("REQUIRED_PROPERTY_MISSING")
    })

    test("should validate array schema", () => {
      const schema: Schema = {
        type: "array",
        items: { type: "string" },
        minItems: 1,
        maxItems: 3,
      }

      const validResult = validate(["a", "b"], schema)
      expect(validResult.isValid).toBe(true)

      const emptyArrayResult = validate([], schema)
      expect(emptyArrayResult.isValid).toBe(false)
      expect(emptyArrayResult.errors[0].code).toBe("MIN_ITEMS_VIOLATION")

      const tooManyItemsResult = validate(["a", "b", "c", "d"], schema)
      expect(tooManyItemsResult.isValid).toBe(false)
      expect(tooManyItemsResult.errors[0].code).toBe("MAX_ITEMS_VIOLATION")
    })
  })

  describe("Advanced Schema Validation", () => {
    test("should validate string constraints", () => {
      const schema: Schema = {
        type: "string",
        minLength: 3,
        maxLength: 10,
        pattern: /^[a-zA-Z]+$/,
      }

      const validResult = validate("hello", schema)
      expect(validResult.isValid).toBe(true)

      const tooShortResult = validate("hi", schema)
      expect(tooShortResult.isValid).toBe(false)
      expect(tooShortResult.errors[0].code).toBe("MIN_LENGTH_VIOLATION")

      const tooLongResult = validate("verylongstring", schema)
      expect(tooLongResult.isValid).toBe(false)
      expect(tooLongResult.errors[0].code).toBe("MAX_LENGTH_VIOLATION")

      const patternMismatchResult = validate("hello123", schema)
      expect(patternMismatchResult.isValid).toBe(false)
      expect(patternMismatchResult.errors[0].code).toBe("PATTERN_MISMATCH")
    })

    test("should validate string enum", () => {
      const schema: Schema = {
        type: "string",
        enum: ["red", "green", "blue"],
      }

      const validResult = validate("red", schema)
      expect(validResult.isValid).toBe(true)

      const invalidResult = validate("yellow", schema)
      expect(invalidResult.isValid).toBe(false)
      expect(invalidResult.errors[0].code).toBe("ENUM_VIOLATION")
    })

    test("should validate number constraints", () => {
      const schema: Schema = {
        type: "number",
        min: 0,
        max: 100,
        integer: true,
      }

      const validResult = validate(50, schema)
      expect(validResult.isValid).toBe(true)

      const tooSmallResult = validate(-1, schema)
      expect(tooSmallResult.isValid).toBe(false)
      expect(tooSmallResult.errors[0].code).toBe("MIN_VALUE_VIOLATION")

      const tooLargeResult = validate(101, schema)
      expect(tooLargeResult.isValid).toBe(false)
      expect(tooLargeResult.errors[0].code).toBe("MAX_VALUE_VIOLATION")

      const notIntegerResult = validate(50.5, schema)
      expect(notIntegerResult.isValid).toBe(false)
      expect(notIntegerResult.errors[0].code).toBe("INTEGER_REQUIRED")
    })

    test("should validate nested objects", () => {
      const schema: Schema = {
        type: "object",
        properties: {
          user: {
            type: "object",
            properties: {
              name: { type: "string", required: true },
              profile: {
                type: "object",
                properties: {
                  email: { type: "string", required: true },
                  age: { type: "number", required: false },
                },
              },
            },
          },
        },
      }

      const validData = {
        user: {
          name: "John",
          profile: {
            email: "john@example.com",
            age: 30,
          },
        },
      }

      const validResult = validate(validData, schema)
      expect(validResult.isValid).toBe(true)

      const invalidData = {
        user: {
          name: "John",
          profile: {
            age: 30,
            // missing email
          },
        },
      }

      const invalidResult = validate(invalidData, schema)
      expect(invalidResult.isValid).toBe(false)
      expect(invalidResult.errors[0].path).toBe("user.profile.email")
    })

    test("should validate arrays of objects", () => {
      const schema: Schema = {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: { type: "number", required: true },
            name: { type: "string", required: true },
          },
        },
      }

      const validData = [
        { id: 1, name: "Item 1" },
        { id: 2, name: "Item 2" },
      ]

      const validResult = validate(validData, schema)
      expect(validResult.isValid).toBe(true)

      const invalidData = [
        { id: 1, name: "Item 1" },
        { id: "2", name: "Item 2" }, // id should be number
      ]

      const invalidResult = validate(invalidData, schema)
      expect(invalidResult.isValid).toBe(false)
      expect(invalidResult.errors[0].path).toBe("1.id")
    })
  })

  describe("Custom Validation", () => {
    test("should support custom validation functions", () => {
      const schema: Schema = {
        type: "string",
        validate: (value) => {
          if (typeof value === "string" && value.includes("@")) {
            return true
          }
          return "Must contain @ symbol"
        },
      }

      const validResult = validate("test@example.com", schema)
      expect(validResult.isValid).toBe(true)

      const invalidResult = validate("testexample.com", schema)
      expect(invalidResult.isValid).toBe(false)
      expect(invalidResult.errors[0].message).toBe("Must contain @ symbol")
    })

    test("should handle custom validation errors", () => {
      const schema: Schema = {
        type: "number",
        validate: () => {
          throw new Error("Custom validation error")
        },
      }

      const result = validate(123, schema)
      expect(result.isValid).toBe(false)
      expect(result.errors[0].code).toBe("CUSTOM_VALIDATION_FAILED")
    })
  })

  describe("Nullable and Optional Fields", () => {
    test("should handle nullable fields", () => {
      const schema: Schema = {
        type: "string",
        nullable: true,
        required: true,
      }

      const validStringResult = validate("hello", schema)
      expect(validStringResult.isValid).toBe(true)

      const validNullResult = validate(null, schema)
      expect(validNullResult.isValid).toBe(true)

      const invalidResult = validate(123, schema)
      expect(invalidResult.isValid).toBe(false)
    })

    test("should handle optional fields", () => {
      const schema: Schema = {
        type: "object",
        properties: {
          required_field: { type: "string", required: true },
          optional_field: { type: "string", required: false },
        },
      }

      const validWithOptionalResult = validate(
        {
          required_field: "value",
          optional_field: "optional",
        },
        schema,
      )
      expect(validWithOptionalResult.isValid).toBe(true)

      const validWithoutOptionalResult = validate(
        {
          required_field: "value",
        },
        schema,
      )
      expect(validWithoutOptionalResult.isValid).toBe(true)

      const invalidResult = validate(
        {
          optional_field: "optional",
        },
        schema,
      )
      expect(invalidResult.isValid).toBe(false)
    })
  })

  describe("Type Coercion", () => {
    test("should coerce types when enabled", () => {
      const validator = createValidator({ coerceTypes: true })

      const stringSchema: Schema = { type: "string" }
      const numberResult = validator.validate(123, stringSchema)
      expect(numberResult.isValid).toBe(true)

      const numberSchema: Schema = { type: "number" }
      const stringResult = validator.validate("123", numberSchema)
      expect(stringResult.isValid).toBe(true)

      const booleanSchema: Schema = { type: "boolean" }
      const trueStringResult = validator.validate("true", booleanSchema)
      expect(trueStringResult.isValid).toBe(true)

      const oneResult = validator.validate(1, booleanSchema)
      expect(oneResult.isValid).toBe(true)
    })

    test("should handle coercion failures", () => {
      const validator = createValidator({ coerceTypes: true })

      const numberSchema: Schema = { type: "number" }
      const invalidStringResult = validator.validate("not-a-number", numberSchema)
      expect(invalidStringResult.isValid).toBe(false)
      expect(invalidStringResult.errors[0].code).toBe("COERCION_FAILED")
    })
  })

  describe("Validation Options", () => {
    test("should respect max depth option", () => {
      const deepObject = { level1: { level2: { level3: { level4: { level5: "deep" } } } } }
      const schema: Schema = { type: "object", properties: {} }

      const validator = createValidator({ maxDepth: 3 })
      const result = validator.validate(deepObject, schema)

      expect(result.isValid).toBe(false)
      expect(result.errors[0].code).toBe("MAX_DEPTH_EXCEEDED")
    })

    test("should handle strict mode", () => {
      const validator = createValidator({ strict: true })
      const schema: Schema = { type: "string" }

      // In strict mode, additional validation might be performed
      const result = validator.validate("test", schema)
      expect(result.isValid).toBe(true)
    })

    test("should handle extra properties", () => {
      const schema: Schema = {
        type: "object",
        properties: {
          name: { type: "string", required: true },
        },
        additionalProperties: false,
      }

      const validator = createValidator({ allowExtraProperties: false })
      const result = validator.validate(
        {
          name: "test",
          extra: "property",
        },
        schema,
      )

      expect(result.warnings).toBeTruthy()
      expect(result.warnings?.[0]).toContain("Extra property")
    })
  })

  describe("JSON Utilities", () => {
    test("should parse JSON safely", () => {
      const validJson = '{"name":"test","value":123}'
      const result = safeJsonParse(validJson)

      expect(result.success).toBe(true)
      expect(result.data).toEqual({ name: "test", value: 123 })
    })

    test("should handle invalid JSON", () => {
      const invalidJson = '{"name":"test",}'
      const result = safeJsonParse(invalidJson)

      expect(result.success).toBe(false)
      expect(result.error).toBeTruthy()
    })

    test("should stringify safely", () => {
      const data = { name: "test", value: 123 }
      const result = safeStringify(data)

      expect(result).toBe('{"name":"test","value":123}')
    })

    test("should handle circular references", () => {
      const circular: any = { name: "test" }
      circular.self = circular

      const result = safeStringify(circular)
      expect(result).toContain("[Circular Reference]")
    })

    test("should deep clone objects", () => {
      const original = {
        name: "test",
        nested: { value: 123 },
        array: [1, 2, 3],
      }

      const cloned = deepClone(original)

      expect(cloned).toEqual(original)
      expect(cloned).not.toBe(original)
      expect(cloned.nested).not.toBe(original.nested)
      expect(cloned.array).not.toBe(original.array)
    })

    test("should compare objects deeply", () => {
      const obj1 = { name: "test", nested: { value: 123 } }
      const obj2 = { name: "test", nested: { value: 123 } }
      const obj3 = { name: "test", nested: { value: 456 } }

      expect(deepEqual(obj1, obj2)).toBe(true)
      expect(deepEqual(obj1, obj3)).toBe(false)
    })

    test("should handle special values in deep comparison", () => {
      const date1 = new Date("2024-01-01")
      const date2 = new Date("2024-01-01")
      const date3 = new Date("2024-01-02")

      expect(deepEqual(date1, date2)).toBe(true)
      expect(deepEqual(date1, date3)).toBe(false)

      expect(deepEqual(null, null)).toBe(true)
      expect(deepEqual(undefined, undefined)).toBe(true)
      expect(deepEqual(null, undefined)).toBe(false)
    })
  })

  describe("Performance Tests", () => {
    test("should validate large objects efficiently", () => {
      const largeObject = {
        items: Array.from({ length: 10000 }, (_, i) => ({
          id: i,
          name: `Item ${i}`,
          value: i * 2,
        })),
      }

      const schema: Schema = {
        type: "object",
        properties: {
          items: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "number", required: true },
                name: { type: "string", required: true },
                value: { type: "number", required: true },
              },
            },
          },
        },
      }

      const start = performance.now()
      const result = validate(largeObject, schema)
      const end = performance.now()

      expect(result.isValid).toBe(true)
      expect(end - start).toBeLessThan(1000) // Should complete in less than 1 second
    })

    test("should handle deep nesting efficiently", () => {
      let deepObject: any = { value: "deep" }
      for (let i = 0; i < 100; i++) {
        deepObject = { nested: deepObject }
      }

      const start = performance.now()
      const cloned = deepClone(deepObject)
      const end = performance.now()

      expect(end - start).toBeLessThan(100) // Should complete in less than 100ms
      expect(deepEqual(deepObject, cloned)).toBe(true)
    })
  })

  describe("Error Handling", () => {
    test("should handle validation errors gracefully", () => {
      const schema: Schema = {
        type: "object",
        validate: () => {
          throw new Error("Validation error")
        },
      }

      const result = validate({}, schema)
      expect(result.isValid).toBe(false)
      expect(result.errors[0].code).toBe("CUSTOM_VALIDATION_FAILED")
    })

    test("should handle malformed schemas", () => {
      const malformedSchema: any = {
        type: "invalid-type",
      }

      const result = validate("test", malformedSchema)
      expect(result.isValid).toBe(false)
      expect(result.errors[0].code).toBe("UNKNOWN_SCHEMA_TYPE")
    })

    test("should handle edge cases in type guards", () => {
      // Test with various edge cases
      expect(isString(String("test"))).toBe(true)
      expect(isNumber(Number(123))).toBe(true)
      expect(isBoolean(Boolean(true))).toBe(true)

      // Test with constructor objects
      expect(isString(new String("test"))).toBe(false) // String objects are not primitive strings
      expect(isNumber(new Number(123))).toBe(false)
      expect(isBoolean(new Boolean(true))).toBe(false)
    })
  })
})
