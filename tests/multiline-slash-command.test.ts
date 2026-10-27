import { describe, expect, it } from "@jest/globals";
import { Value } from "@sinclair/typebox/value";
import { Logs } from "@ubiquity-os/ubiquity-os-logger";
import { DataPurgeModule } from "../src/parser/data-purge-module";
import { ContextPlugin, pluginSettingsSchema } from "../src/types/plugin-input";

describe("DataPurgeModule multiline slash command removal (#242)", () => {
  const config = Value.Default(pluginSettingsSchema, {
    incentives: {
      dataPurge: {},
    },
  });
  const module = new DataPurgeModule({
    config,
    logger: new Logs("debug"),
  } as unknown as ContextPlugin);

  const clean = (body: string) =>
    (module as unknown as { _cleanCommentBody(b: string): string })._cleanCommentBody(body);

  it("removes single-line slash commands completely", () => {
    expect(clean("/start")).toBe("");
    expect(clean("/stop")).toBe("");
    expect(clean("/wallet 0x1234567890abcdef1234567890abcdef12345678")).toBe("");
  });

  it("removes multiline slash commands such as /ask with multiline payload", () => {
    const multilineCommand =
      "/ask Can you explain how the scoring works?\nAlso check why my second line was evaluated.\nThanks!";
    expect(clean(multilineCommand)).toBe("");
  });

  it("removes multiline /ask commands with table payloads (issue #242 reproduction)", () => {
    const tableCommand =
      "/ask now write a sequence for every role/persona\n\nPersona Fit,,,,,,,,\n,,Role,Department,Influence Level\n,DAO Community/DevRel Managers,Community managers";
    expect(clean(tableCommand)).toBe("");
  });

  it("removes slash commands with leading whitespace and newlines", () => {
    expect(clean("\n  /ask\nPlease score this follow-up text.")).toBe("");
  });

  it("removes slash commands preceded by quoted text or HTML comments", () => {
    expect(clean("> quote from previous discussion\n/ask follow-up prompt\nspanning multiple lines")).toBe("");
    expect(clean("<!-- UbiquityOS bot metadata -->\n/ask follow-up prompt\nspanning multiple lines")).toBe("");
  });

  it("preserves normal multiline comments while removing embedded single-line slash commands", () => {
    const mixedComment = "Useful context\n/start\nMore context";
    expect(clean(mixedComment)).toBe("Useful context\n\nMore context");
  });

  it("preserves comments with file paths starting with slash", () => {
    const pathComment = "The file is located at:\n/src/index.ts\nPlease check line 40.";
    expect(clean(pathComment)).toBe("The file is located at:\n/src/index.ts\nPlease check line 40.");
  });

  it("preserves normal comments preceding a trailing multiline /ask command", () => {
    const trailingAsk = "Here is my analysis of the issue.\n/ask follow up question\nspanning two lines";
    expect(clean(trailingAsk)).toBe("Here is my analysis of the issue.");
  });
});
