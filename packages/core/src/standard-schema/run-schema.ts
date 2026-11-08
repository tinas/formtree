import type { ErrorInput } from '../errors/form-error'
import type { StandardSchemaIssue, StandardSchemaResult, StandardSchemaV1 } from './standard-schema'

import { joinSegments } from '../paths/path'

export interface SchemaRunSuccess {
  readonly valid: true
  readonly output: unknown
}

export interface SchemaRunFailure {
  readonly valid: false
  readonly errors: ReadonlyArray<ErrorInput>
}

export type SchemaRun = SchemaRunSuccess | SchemaRunFailure

export function runSchema(schema: StandardSchemaV1, value: unknown): SchemaRun | Promise<SchemaRun> {
  const result = schema['~standard'].validate(value)
  return result instanceof Promise ? result.then(toSchemaRun) : toSchemaRun(result)
}

function toSchemaRun(result: StandardSchemaResult<unknown>): SchemaRun {
  if (result.issues) {
    return {
      valid: false,
      errors: result.issues.map(issueToErrorInput),
    }
  }
  return {
    valid: true,
    output: result.value,
  }
}

function issueToErrorInput(issue: StandardSchemaIssue): ErrorInput {
  const { message, path, ...details } = issue as StandardSchemaIssue & Record<string, unknown>
  return {
    path: issuePathToString(path),
    code: message,
    params: Object.keys(details).length > 0 ? details : undefined,
  }
}

function issuePathToString(path: StandardSchemaIssue['path']): string {
  return joinSegments(Array.from(path ?? [], segment => String(typeof segment == 'object' ? segment.key : segment)))
}
