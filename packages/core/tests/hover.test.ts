import { describe, expect, test } from 'vite-plus/test'
import ts from 'typescript-5'

const PACKAGE_DIRECTORY = `${import.meta.dirname}/..`
const FIXTURE_PATH = `${import.meta.dirname}/fixtures/hover.ts`
const FIXTURE_TEXT = ts.sys.readFile(FIXTURE_PATH) ?? ''

function readFile(path: string): string | undefined {
  return ts.sys.readFile(path)
}

function createService(): ts.LanguageService {
  const { config } = ts.readConfigFile(`${PACKAGE_DIRECTORY}/tsconfig.json`, readFile)
  const { options } = ts.parseJsonConfigFileContent(config, ts.sys, PACKAGE_DIRECTORY)
  return ts.createLanguageService({
    getScriptFileNames: () => [FIXTURE_PATH],
    getScriptVersion: () => '0',
    getScriptSnapshot: path => {
      const text = readFile(path)
      return text == undefined ? undefined : ts.ScriptSnapshot.fromString(text)
    },
    getCurrentDirectory: () => PACKAGE_DIRECTORY,
    getCompilationSettings: () => options,
    getDefaultLibFileName: ts.getDefaultLibFilePath,
    fileExists: path => ts.sys.fileExists(path),
    readFile,
  })
}

const service = createService()

function hoverOf(typeName: string): string {
  const position = FIXTURE_TEXT.indexOf(`type ${typeName} `) + 'type '.length
  return ts.displayPartsToString(service.getQuickInfoAtPosition(FIXTURE_PATH, position)?.displayParts)
}

describe('hover types', () => {
  test('a draft reads as a plain object at every depth', () => {
    expect(hoverOf('CheckoutDraft')).toBe(`type CheckoutDraft = {
    isGift?: boolean | undefined;
    address: {
        street?: string | undefined;
        city?: string | undefined;
        postalCode?: string | undefined;
    };
    lineItems: {
        name?: string | undefined;
        quantity?: number | undefined;
    }[];
    coupons: (string | undefined)[];
    email?: string | undefined;
    giftMessage?: string | undefined;
}`)
  })

  test('an output reads as a plain object at every depth', () => {
    expect(hoverOf('CheckoutOutput')).toBe(`type CheckoutOutput = {
    isGift: boolean;
    address: {
        street: string;
        city: string;
        postalCode: string;
    };
    lineItems: {
        name: string;
        quantity: number;
    }[];
    email: string;
    coupons: string[];
    giftMessage?: string | undefined;
}`)
  })

  test('a group node shows its values and its children', () => {
    expect(hoverOf('AddressNode')).toBe(`type AddressNode = GroupNode<GroupDefinition<{
    street: string;
    city: string;
    postalCode: string;
}, {
    street: string;
    city: string;
    postalCode: string;
}, undefined, {
    street?: string | undefined;
    city?: string | undefined;
    postalCode?: string | undefined;
}, {
    postalCode: FieldDefinition<string, string, undefined, string | undefined>;
}>>`)
  })

  test('an array node shows the definition of its items', () => {
    expect(hoverOf('LineItemsNode')).toBe(`type LineItemsNode = ArrayNode<ArrayDefinition<GroupDefinition<{
    name: string;
    quantity: number;
}, {
    name: string;
    quantity: number;
}, undefined, {
    name?: string | undefined;
    quantity?: number | undefined;
}, {}>>>`)
  })
})
