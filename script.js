(function(){
  // ... (All constants, helper functions, and the tokenize function remain the same) ...

  const keywords = [
    "anchor", "ask", "parrot", "truthy", "aye", "nay", "adrift", "pirate", "doubloon", "gold", "scroll", 
    "ifwind", "elseye", "otherwise", "fer", "storm", "cut", "onward", "sailby", "ashore", "cease", 
    "venture", "reel", "lastport", "alarm", "ayecheck", "sevenseas", "horizon", "be", "aboard", "withcrew", 
    "eitherway", "naycrew", "naybe", "nayaboard", "rank", "map", "sink", "alias", "hauled", "shipin", "accord", "voyage", "holdfast"
  ];

  function isKeyword(word, index = 0) {
    if (index >= keywords.length) return false;
    if (keywords[index] === word) return true;
    return isKeyword(word, index + 1);
  }

  const invalidSequences = {
    '+=': ['+=', '-=', '*=', '/=', '==', '!=', '<=', '>=', '=', ':', '%', '/', '*'],
    '-=': ['+=', '-=', '*=', '/=', '==', '!=', '<=', '>=', '=', ':', '%', '/', '*'],
    '*=': ['+=', '-=', '*=', '/=', '==', '!=', '<=', '>=', '=', ':', '%', '/', '*'],
    '/=': ['+=', '-=', '*=', '/=', '==', '!=', '<=', '>=', '=', ':', '%', '/', '*'],
    '=': ['+=', '-=', '*=', '/=', '==', '!=', '<=', '>=', '=', ':', '%', '/', '*'],
    '==': ['+=', '-=', '*=', '/=', '==', '!=', '<=', '>=', '=', ':', '<', '>'],
    '!=': ['+=', '-=', '*=', '/=', '==', '!=', '<=', '>=', '=', ':', '<', '>'],
    '<=': ['+=', '-=', '*=', '/=', '==', '!=', '<=', '>=', '=', ':', '<', '>'],
    '>=': ['+=', '-=', '*=', '/=', '==', '!=', '<=', '>=', '=', ':', '<', '>'],
    '<': ['+=', '-=', '*=', '/=', '==', '!=', '<=', '>=', '=', ':', '<', '>'],
    '>': ['+=', '-=', '*=', '/=', '==', '!=', '<=', '>=', '=', ':', '<', '>'],
    '+': ['+=', '-=', '*=', '/=', '==', '!=', '<=', '>=', '=', ':'],
    '*': ['+=', '-=', '*=', '/=', '==', '!=', '<=', '>=', '=', ':'],
    '/': ['+=', '-=', '*=', '/=', '==', '!=', '<=', '>=', '=', ':'],
    '%': ['+=', '-=', '*=', '/=', '==', '!=', '<=', '>=', '=', ':'],
    ':': ['+=', '-=', '*=', '/=', '==', '!=', '<=', '>=', '=', ':', '+', '*', '/', '%', '<', '>'],
  };

  function tokenize(input) {
    const tokens = [];
    const errors = [];
    let pos = 0;
    let line = 1;
    let col = 1;

    function peek(offset = 0) {
      return input[pos + offset] || null;
    }

    function advance() {
      const ch = input[pos];
      pos++;
      if (ch === '\n') {
        line++;
        col = 1;
      } else {
        col++;
      }
      return ch;
    }

    function peekStr(len) {
      return input.slice(pos, pos + len);
    }

    function isDigit(ch) {
      return ch >= '0' && ch <= '9';
    }

    function isAlpha(ch) {
      return (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') || ch === '_';
    }

    function isAlphaNum(ch) {
      return isAlpha(ch) || isDigit(ch);
    }

    function isWhitespace(ch) {
      return ch === ' ' || ch === '\t' || ch === '\r';
    }

    function skipWhitespace() {
      while (peek() && isWhitespace(peek())) {
        advance();
      }
    }

    function readNewlines() {
      const startLine = line;
      const startCol = col;
      while (peek() === '\n') {
        advance();
      }
      tokens.push({ type: "NEWLINE", value: "\\n", tokenType: "SEPARATOR", line: startLine, col: startCol });
    }

    function readComment() {
      const startLine = line;
      const startCol = col;
      
      if (peekStr(3) !== '<<<') return false;
      
      let lexeme = '';
      advance(); advance(); advance();
      lexeme += '<<<';

      let isMulti = false;
      let depth = 0;
      let tempPos = pos;
      
      while (tempPos < input.length) {
        if (input.slice(tempPos, tempPos + 3) === '>>>') {
          isMulti = true;
          break;
        }
        if (input[tempPos] === '\n') {
          break;
        }
        tempPos++;
      }

      if (isMulti) {
        while (pos < input.length) {
          if (peekStr(3) === '<<<') {
            depth++;
            lexeme += advance();
            lexeme += advance();
            lexeme += advance();
          } else if (peekStr(3) === '>>>') {
            lexeme += advance();
            lexeme += advance();
            lexeme += advance();
            if (depth === 0) break;
            depth--;
          } else {
            lexeme += advance();
          }
        }
        tokens.push({ type: "COMMENT_MULTI", value: lexeme, tokenType: "COMMENT", line: startLine, col: startCol });
      } else {
        while (peek() && peek() !== '\n') {
          lexeme += advance();
        }
        tokens.push({ type: "COMMENT_SINGLE", value: lexeme, tokenType: "COMMENT", line: startLine, col: startCol });
      }
      return true;
    }

    function readNumber() {
      const startLine = line;
      const startCol = col;
      let lexeme = '';
      let isDouble = false;
      let dotCount = 0;

      // Handle optional leading sign
      if (peek() === '-') {
        lexeme += advance();
      }

      // Check if it's not a number at all (e.g., just an operator or identifier)
      if (!isDigit(peek()) && peek() !== '.') {
        // If only '-' was consumed, put it back and return false
        if (lexeme === '-') {
            pos--;
            col--;
        }
        return false;
      }
      
      // Read the number part
      while (peek()) {
        const ch = peek();
        
        if (isDigit(ch)) {
          lexeme += advance();
        } else if (ch === '.') {
          dotCount++;
          if (dotCount > 1) {
             // Found '5.5.5' or '2..2' - consume all the way to the next non-digit/non-dot
             lexeme += advance();
             while (peek() && (isDigit(peek()) || peek() === '.')) {
               lexeme += advance();
             }
             errors.push({
               code: "E002",
               message: `Malformed number literal: multiple decimal points ('${lexeme}')`,
               line: startLine,
               col: startCol
             });
             return true;
          }
          isDouble = true;
          lexeme += advance();
        } else if (ch === 'e' || ch === 'E') {
          // Scientific notation
          isDouble = true;
          lexeme += advance();
          
          if (peek() === '+' || peek() === '-') {
            lexeme += advance();
          }
          
          if (!isDigit(peek())) {
            // Malformed: e.g., '5e' or '5e+'
            while (peek() && isAlphaNum(peek())) {
              lexeme += advance();
            }
            errors.push({
              code: "E002",
              message: `Malformed number literal: missing exponent value ('${lexeme}')`,
              line: startLine,
              col: startCol
            });
            return true;
          }
          
          while (peek() && isDigit(peek())) {
            lexeme += advance();
          }
          break; // Exit loop after consuming exponent
        } else {
          // Stop when hitting non-number characters (e.g., operator, whitespace, identifier)
          break;
        }
      }

      // Final checks for malformed literals

      // Case 1: Trailing dot (e.g., '5.')
      if (lexeme.endsWith('.') && lexeme.length > 1) {
        errors.push({
          code: "E002",
          message: `Malformed number literal: trailing decimal point ('${lexeme}')`,
          line: startLine,
          col: startCol
        });
        return true;
      }
      
      // Case 2: Illegal identifier (e.g., '5a' or '5.5a')
      if (peek() && isAlpha(peek())) {
        while (peek() && isAlphaNum(peek())) {
          lexeme += advance();
        }
        errors.push({
          code: "E003",
          message: `Illegal identifier '${lexeme}' (cannot start with digit)`,
          line: startLine,
          col: startCol
        });
        return true;
      }

      // Successfully tokenized
      const type = isDouble ? "DOUBLE" : "INTEGER";
      const tokenType = isDouble ? "DBL_LIT" : "INT_LIT";
      tokens.push({ type, value: lexeme, tokenType, line: startLine, col: startCol });
      return true;
    }

    function readString() {
      const startLine = line;
      const startCol = col;
      const quote = peek();
      
      // Check for start of a standard single-line string
      if (quote !== '"' && quote !== "'") return false;

      let lexeme = '';
      
      // Consume the opening quote
      lexeme += advance(); 
      
      while (peek()) {
        const ch = peek();
        
        // Disallow newlines inside a single-line string (Unterminated error)
        if (ch === '\n') {
          errors.push({
            code: "E001",
            message: `Unterminated string literal (missing closing ${quote})`,
            line: startLine,
            col: startCol
          });
          return true;
        }
        
        // Handle escaped characters (e.g., \n, \t, \", \\)
        if (ch === '\\') {
          lexeme += advance(); // Consume the backslash
          if (peek()) {
            lexeme += advance(); // Consume the escaped character
          }
          continue;
        }
        
        // Handle closing quote
        if (ch === quote) {
          lexeme += advance(); // Consume the closing quote
          tokens.push({ type: "STRING", value: lexeme, tokenType: "STRING_LIT", line: startLine, col: startCol });
          return true;
        }
        
        // Consume regular character
        lexeme += advance();
      }

      // If the loop finishes without finding a closing quote
      errors.push({
        code: "E001",
        message: `Unterminated string literal (missing closing ${quote})`,
        line: startLine,
        col: startCol
      });
      return true;
    }

    function readIdentifier() {
      const startLine = line;
      const startCol = col;
      
      if (!isAlpha(peek())) return false;
      
      let lexeme = '';
      while (peek() && isAlphaNum(peek())) {
        lexeme += advance();
      }

      const type = isKeyword(lexeme) ? "KEYWORD" : "IDENTIFIER";
      const tokenType = isKeyword(lexeme) ? "KEYWORD" : "IDENTIFIER";
      tokens.push({ type, value: lexeme, tokenType, line: startLine, col: startCol });
      return true;
    }

    function readOperator() {
      const startLine = line;
      const startCol = col;
      const ch = peek();
      let lexeme = '';

      const twoChar = peekStr(2);
      if (['+=', '-=', '*=', '/=', '==', '!=', '<=', '>=', '//', '<<', '>>'].includes(twoChar)) {
        lexeme = twoChar;
        advance();
        advance();
      } else if (['+', '-', '*', '/', '%', '=', ':', '<', '>', '&', '|', '^', '~'].includes(ch)) {
        lexeme = ch;
        advance();
      } else {
        return false;
      }

      let lastOpToken = null;
      for (let i = tokens.length - 1; i >= 0; i--) {
        const prevToken = tokens[i];
        if (prevToken.type === "OPERATOR") {
          lastOpToken = prevToken;
          break;
        } else if (prevToken.type !== "NEWLINE" && prevToken.type !== "COMMENT_SINGLE" && prevToken.type !== "COMMENT_MULTI") {
          break;
        }
      }

      if (lastOpToken) {
        const prevOp = lastOpToken.value;
        if (invalidSequences[prevOp] && invalidSequences[prevOp].includes(lexeme)) {
          errors.push({
            code: "E004",
            message: `Invalid operator sequence: '${prevOp}' cannot be followed by '${lexeme}'`,
            line: startLine,
            col: startCol
          });
        }
      }

      tokens.push({ type: "OPERATOR", value: lexeme, tokenType: "OPERATOR", line: startLine, col: startCol });
      return true;
    }

    function readPunctuation() {
      const startLine = line;
      const startCol = col;
      const ch = peek();
      
      if (['(', ')', '[', ']', '{', '}', ',', '.'].includes(ch)) {
        const lexeme = advance();
        tokens.push({ type: "PUNCTUATION", value: lexeme, tokenType: "SEPARATOR", line: startLine, col: startCol });
        return true;
      }
      return false;
    }

    while (pos < input.length) {
      skipWhitespace();
      
      if (pos >= input.length) break;

      if (peek() === '\n') {
        readNewlines();
        continue;
      }

      if (readComment()) continue;
      if (readString()) continue;
      if (readNumber()) continue;
      if (readIdentifier()) continue;
      if (readOperator()) continue;
      if (readPunctuation()) continue;

      const badChar = peek();
      errors.push({
        code: "E000",
        message: `Unrecognized token '${badChar}'`,
        line,
        col
      });
      advance();
    }

    return { tokens, errors };
  }

  // >>>>>>>>>>>>>> START OF DOM CONTENT WRAPPER <<<<<<<<<<<<<<
  document.addEventListener('DOMContentLoaded', () => {
    const srcEl = document.getElementById("source");
    const lineNumbersEl = document.getElementById("lineNumbers");
    const btn = document.getElementById("tokenizeBtn");
    const clearBtn = document.getElementById("clearBtn");
    const tbody = document.querySelector("#tokensTable tbody");
    const errorsDiv = document.getElementById("errors");

    let currentErrors = [];

    function updateLineNumbers() {
      const lines = srcEl.value.split('\n');
      const errorLines = new Set(currentErrors.map(e => e.line));
      
      lineNumbersEl.innerHTML = lines.map((_, i) => {
        const lineNum = i + 1;
        const isError = errorLines.has(lineNum);
        return `<div class="${isError ? 'error-line' : ''}">${lineNum}</div>`;
      }).join('');
    }

    function syncScroll() {
      lineNumbersEl.scrollTop = srcEl.scrollTop;
    }

    srcEl.addEventListener('input', updateLineNumbers);
    srcEl.addEventListener('scroll', syncScroll);

    btn.addEventListener("click", () => {
      tbody.innerHTML = "";
      errorsDiv.textContent = "";
      const input = srcEl.value;
      const { tokens, errors } = tokenize(input);
      
      currentErrors = errors;
      updateLineNumbers();

      tokens.forEach((t) => {
        const tr = document.createElement("tr");
        const token = t.type === "KEYWORD" ? escapeHtml(t.value) : t.type;
        tr.innerHTML = `
          <td>${escapeHtml(t.value)}</td>
          <td>${token}</td>
          <td>${t.tokenType}</td>
        `;
        tbody.appendChild(tr);
      });

      if (errors.length) {
        errorsDiv.textContent = errors.map(e => `[${e.code}] ${e.message} (line ${e.line}, col ${e.col})`).join('\n');
      }
    });

    clearBtn.addEventListener("click", () => {
      srcEl.value = "";
      tbody.innerHTML = "";
      errorsDiv.textContent = "";
      currentErrors = [];
      updateLineNumbers();
    });

    function escapeHtml(str) {
      return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    }

    // Initialize
    updateLineNumbers();
  }); // <<<<<<<<<<<<<< END OF DOM CONTENT WRAPPER <<<<<<<<<<<<<<

})();