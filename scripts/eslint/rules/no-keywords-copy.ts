import * as ESTree from 'estree'
import * as eslint from 'eslint'
import {TSESTree, AST_NODE_TYPES, TSESLint,} from '@typescript-eslint/utils'
import {createRule} from './utils'


export = new class implements eslint.Rule.RuleModule {
  readonly meta: eslint.Rule.RuleMetaData = {
    docs: {
      description: `disallows the use of certain TypeScript keywords as variable or parameter names`,
    },
    messages: {
      noKeywordsError: `{{ name }} clashes with keyword/type`,
    },
    schema: [{
      properties: {
        properties: {type: "boolean"},
        keywords: {type: "boolean"},
      },
      type: "object",
    }],
    type: "suggestion",
  }

  create(context: eslint.Rule.RuleContext): eslint.Rule.RuleListener {
    const keywords = [
      "Undefined",
      "undefined",
      "Boolean",
      "boolean",
      "String",
      "string",
      "Number",
      "number",
      "any",
    ];

    const isKeyword = (name: string) => keywords.includes(name);

    const report = (node: TSESTree.Identifier) => {
      context.report({messageId: "noKeywordsError", data: {name: node.name}, node});
    };

    const checkProperties = (node: TSESTree.ObjectPattern) => {
      node.properties.forEach(property => {
        if (
          property &&
          property.type === AST_NODE_TYPES.Property &&
          property.key.type === AST_NODE_TYPES.Identifier &&
          isKeyword(property.key.name)
        ) {
          report(property.key);
        }
      });
    };

    const checkElements = (node: TSESTree.ArrayPattern) => {
      node.elements.forEach(element => {
        if (
          element &&
          element.type === AST_NODE_TYPES.Identifier &&
          isKeyword(element.name)
        ) {
          report(element);
        }
      });
    };

    const checkParams = (
      node: TSESTree.ArrowFunctionExpression | TSESTree.FunctionDeclaration | TSESTree.FunctionExpression | TSESTree.TSMethodSignature | TSESTree.TSFunctionType |
            ESTree.ArrowFunctionExpression | ESTree.FunctionDeclaration | ESTree.FunctionExpression
    ) => {
      if (!node || !node.params || !node.params.length) {
        return;
      }

      node.params.forEach((param: any) => {
        if (
          param &&
          param.type === AST_NODE_TYPES.Identifier &&
          isKeyword(param.name)
        ) {
          report(param);
        }
      });
    };

    return {
      VariableDeclarator(node: any) {
        if (node.id.type === AST_NODE_TYPES.ObjectPattern) {
          checkProperties(node.id);
        }

        if (node.id.type === AST_NODE_TYPES.ArrayPattern) {
          checkElements(node.id);
        }

        if (
          node.id.type === AST_NODE_TYPES.Identifier &&
          isKeyword(node.id.name)
        ) {
          report(node.id);
        }
      },

      ArrowFunctionExpression: checkParams,
      FunctionDeclaration: checkParams,
      FunctionExpression: checkParams,
      TSMethodSignature: checkParams,
      TSFunctionType: checkParams,
    };
  }
}