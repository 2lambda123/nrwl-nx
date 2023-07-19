import * as ts from 'typescript';

/**
 * Generates an AST from a JSON-type input
 */
export function generateAst<T>(input: unknown, factory: ts.NodeFactory): T {
  if (Array.isArray(input)) {
    return factory.createArrayLiteralExpression(
      input.map((item) => generateAst<ts.Expression>(item, factory)),
      input.length > 1 // multiline only if more than one item
    ) as T;
  }
  if (input === null) {
    return factory.createNull() as T;
  }
  if (typeof input === 'object') {
    return factory.createObjectLiteralExpression(
      Object.entries(input).map(([key, value]) =>
        factory.createPropertyAssignment(
          key,
          generateAst<ts.Expression>(value, factory)
        )
      ),
      true
    ) as T;
  }
  if (typeof input === 'string') {
    return factory.createStringLiteral(input) as T;
  }
  if (typeof input === 'number') {
    return factory.createNumericLiteral(input) as T;
  }
  if (typeof input === 'boolean') {
    return (input ? factory.createTrue() : factory.createFalse()) as T;
  }
  // since we are parsing JSON, this should never happen
  throw new Error(`Unknown type: ${typeof input}`);
}
