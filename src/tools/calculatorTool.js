/**
 * Calculator tool: safe math via mathjs (not eval).
 */

const { create, all } = require("mathjs");
const { DynamicStructuredTool } = require("@langchain/core/tools");
const { z } = require("zod");
const { logInfo, logError } = require("./logger");

// Single shared instance; mathjs evaluate does not execute arbitrary JS like eval().
const math = create(all, {});

const TOOL_NAME = "calculator";

/**
 * @returns {import("@langchain/core/tools").DynamicStructuredTool}
 */
function createCalculatorTool() {
  return new DynamicStructuredTool({
    name: TOOL_NAME,
    description:
      "Evaluates a mathematical expression (numbers, + - * / ^, parentheses, common functions like sqrt, sin, log). " +
      "Input must be a single expression string, not code.",
    schema: z.object({
      expression: z.string().describe("Math expression to evaluate, e.g. '2 + 3 * 4' or 'sqrt(16)'"),
    }),
    func: async ({ expression }) => {
      logInfo("Tool call: calculator", {
        tool: TOOL_NAME,
        input: { expression },
      });

      try {
        const trimmed = String(expression).trim();
        if (!trimmed) {
          logError("Tool call: calculator invalid input", { tool: TOOL_NAME, error: "empty_expression" });
          return "Error: empty expression.";
        }

        const result = math.evaluate(trimmed);
        const readable =
          typeof result === "number" && Number.isFinite(result)
            ? String(result)
            : typeof result === "object" && result !== null && "toString" in result
              ? result.toString()
              : String(result);

        logInfo("Tool result: calculator", {
          tool: TOOL_NAME,
          input: { expression: trimmed },
          output: readable,
        });

        return readable;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        logError("Tool call: calculator error", {
          tool: TOOL_NAME,
          input: { expression },
          error: msg,
        });
        return `Invalid expression: ${msg}`;
      }
    },
  });
}

module.exports = { createCalculatorTool };
