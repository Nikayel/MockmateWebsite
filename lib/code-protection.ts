/**
 * Code Protection Utility
 * Prevents users from removing required code elements like function names, parameters, return types, etc.
 */

export interface ProtectedCodeElements {
  functionName: string | null
  parameters: string[]
  returnType: string | null
  returnStatement: string | null
  classDeclaration: string | null
  methodName: string | null
  requiredImports: string[]
  requiredStructure: string[]
}

/**
 * Extract protected elements from starter code for different languages
 */
export function extractProtectedElements(
  starterCode: string,
  language: string
): ProtectedCodeElements {
  const elements: ProtectedCodeElements = {
    functionName: null,
    parameters: [],
    returnType: null,
    returnStatement: null,
    classDeclaration: null,
    methodName: null,
    requiredImports: [],
    requiredStructure: [],
  }

  const code = starterCode.trim()

  switch (language.toLowerCase()) {
    case 'javascript':
    case 'typescript':
      // Extract function declaration: function name(params) or const name = (params) =>
      const jsFunctionMatch = code.match(/(?:function\s+(\w+)|const\s+(\w+)\s*=\s*(?:\(|function)|(\w+)\s*[:=]\s*(?:\(|function))\s*\(([^)]*)\)/)
      if (jsFunctionMatch) {
        elements.functionName = jsFunctionMatch[1] || jsFunctionMatch[2] || jsFunctionMatch[3]
        if (jsFunctionMatch[4]) {
          elements.parameters = jsFunctionMatch[4]
            .split(',')
            .map(p => p.trim())
            .filter(p => p && !p.includes(':')) // Remove TypeScript types for now
            .map(p => p.split(':')[0].trim())
        }
      }

      // Extract return type for TypeScript
      if (language === 'typescript') {
        const returnTypeMatch = code.match(/\)\s*:\s*(\w+(?:\[\])?|void)/)
        if (returnTypeMatch) {
          elements.returnType = returnTypeMatch[1]
        }
      }

      // Check for return statement requirement
      if (code.includes('return')) {
        const returnMatch = code.match(/return\s+([^;]+);?/)
        if (returnMatch) {
          elements.returnStatement = returnMatch[1].trim()
        }
      }
      break

    case 'python':
      // Extract function: def function_name(params):
      const pythonMatch = code.match(/def\s+(\w+)\s*\(([^)]*)\)\s*:/)
      if (pythonMatch) {
        elements.functionName = pythonMatch[1]
        if (pythonMatch[2]) {
          elements.parameters = pythonMatch[2]
            .split(',')
            .map(p => p.trim())
            .filter(p => p)
            .map(p => p.split(':')[0].trim()) // Remove type hints
        }
      }

      // Check for return type hint
      const returnTypeHint = code.match(/->\s*(\w+)/)
      if (returnTypeHint) {
        elements.returnType = returnTypeHint[1]
      }
      break

    case 'java':
      // Extract class and method: public returnType methodName(params)
      const classMatch = code.match(/class\s+(\w+)/)
      if (classMatch) {
        elements.classDeclaration = classMatch[1]
      }

      const javaMethodMatch = code.match(/(?:public|private|protected)\s+(?:\w+\s+)*(\w+)\s+(\w+)\s*\(([^)]*)\)/)
      if (javaMethodMatch) {
        elements.returnType = javaMethodMatch[1]
        elements.methodName = javaMethodMatch[2]
        if (javaMethodMatch[3]) {
          elements.parameters = javaMethodMatch[3]
            .split(',')
            .map(p => p.trim())
            .filter(p => p)
            .map(p => p.split(/\s+/).pop() || p) // Extract parameter name
        }
      }
      break

    case 'cpp':
    case 'c++':
      // Extract class and method
      const cppClassMatch = code.match(/class\s+(\w+)/)
      if (cppClassMatch) {
        elements.classDeclaration = cppClassMatch[1]
      }

      const cppMethodMatch = code.match(/(\w+)\s+(\w+)\s*\(([^)]*)\)/)
      if (cppMethodMatch) {
        elements.returnType = cppMethodMatch[1]
        elements.methodName = cppMethodMatch[2]
        if (cppMethodMatch[3]) {
          elements.parameters = cppMethodMatch[3]
            .split(',')
            .map(p => p.trim())
            .filter(p => p)
            .map(p => {
              const parts = p.trim().split(/\s+/)
              return parts[parts.length - 1].replace(/[&*]/g, '') // Remove references/pointers
            })
        }
      }
      break

    case 'csharp':
    case 'c#':
      const csharpClassMatch = code.match(/class\s+(\w+)/)
      if (csharpClassMatch) {
        elements.classDeclaration = csharpClassMatch[1]
      }

      const csharpMethodMatch = code.match(/public\s+(\w+)\s+(\w+)\s*\(([^)]*)\)/)
      if (csharpMethodMatch) {
        elements.returnType = csharpMethodMatch[1]
        elements.methodName = csharpMethodMatch[2]
        if (csharpMethodMatch[3]) {
          elements.parameters = csharpMethodMatch[3]
            .split(',')
            .map(p => p.trim())
            .filter(p => p)
            .map(p => p.split(/\s+/).pop() || p)
        }
      }
      break

    case 'go':
      const goMatch = code.match(/func\s+(\w+)\s*\(([^)]*)\)\s+(\w+)/)
      if (goMatch) {
        elements.functionName = goMatch[1]
        elements.returnType = goMatch[3]
        if (goMatch[2]) {
          elements.parameters = goMatch[2]
            .split(',')
            .map(p => p.trim())
            .filter(p => p)
        }
      }
      break

    case 'rust':
      const rustMatch = code.match(/pub\s+fn\s+(\w+)\s*\(([^)]*)\)\s*->\s*(\w+)/)
      if (rustMatch) {
        elements.functionName = rustMatch[1]
        elements.returnType = rustMatch[3]
        if (rustMatch[2]) {
          elements.parameters = rustMatch[2]
            .split(',')
            .map(p => p.trim())
            .filter(p => p)
            .map(p => p.split(':')[0].trim())
        }
      }
      break
  }

  return elements
}

/**
 * Validate that user code contains all required protected elements
 */
export function validateCodeProtection(
  userCode: string,
  protectedElements: ProtectedCodeElements,
  language: string
): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  const code = userCode.trim().toLowerCase()

  // Check function/method name
  if (protectedElements.functionName) {
    const functionNameLower = protectedElements.functionName.toLowerCase()
    if (!code.includes(functionNameLower)) {
      errors.push(`Function name "${protectedElements.functionName}" must be preserved`)
    }
  }

  if (protectedElements.methodName) {
    const methodNameLower = protectedElements.methodName.toLowerCase()
    if (!code.includes(methodNameLower)) {
      errors.push(`Method name "${protectedElements.methodName}" must be preserved`)
    }
  }

  // Check class declaration
  if (protectedElements.classDeclaration) {
    const classLower = protectedElements.classDeclaration.toLowerCase()
    if (!code.includes(`class ${classLower}`) && !code.includes(`class${classLower}`)) {
      errors.push(`Class declaration "${protectedElements.classDeclaration}" must be preserved`)
    }
  }

  // Check parameters (at least some of them should be present)
  if (protectedElements.parameters.length > 0) {
    const missingParams = protectedElements.parameters.filter(
      param => !code.includes(param.toLowerCase())
    )
    if (missingParams.length === protectedElements.parameters.length) {
      errors.push(`Function parameters must be preserved: ${protectedElements.parameters.join(', ')}`)
    }
  }

  // Check return type for typed languages
  if (protectedElements.returnType && ['typescript', 'java', 'cpp', 'c++', 'csharp', 'c#', 'go', 'rust'].includes(language.toLowerCase())) {
    // For languages with explicit return types, check if return type is present
    // This is more lenient - just check if there's a return statement
    if (language === 'python' && protectedElements.returnType !== 'None') {
      // Python return type hints are optional, so we don't enforce them strictly
    } else if (!code.includes('return') && protectedElements.returnType !== 'void') {
      // If there's a non-void return type, there should be a return statement
      // But we'll be lenient here since the user might be implementing it
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}