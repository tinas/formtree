export type Leaf = string | number | boolean | bigint | symbol | null | undefined | Date | Blob

export type EmptyObject = Record<never, never>

export type Simplify<Value> = { [Key in keyof Value]: Value[Key] }

export type Present<Value> = Exclude<Value, undefined>

export type DraftValue<Value> = Value extends Leaf
  ? Value
  : Value extends ReadonlyArray<infer Element>
    ? Array<DraftValue<Element>>
    : Value extends object
      ? DraftObject<Value>
      : Value

export type DraftObject<Value> = { -readonly [Key in keyof Value]?: DraftValue<Value[Key]> }

/**
 * A partial value at every depth; the shape of `initialValue` and of the `value` a reset takes.
 *
 * @category Form
 */
export type DeepPartial<Value> = Value extends Leaf
  ? Value
  : Value extends ReadonlyArray<infer Element>
    ? ReadonlyArray<DeepPartial<Element>>
    : Value extends object
      ? { [Key in keyof Value]?: DeepPartial<Value[Key]> }
      : Value

export type ElementOf<Value> = Value extends ReadonlyArray<infer Element> ? Element : unknown

export type PropertyOf<Value, Key extends PropertyKey> = Key extends keyof Value ? Value[Key] : unknown
