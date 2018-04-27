import * as React from "react"
import * as ReactDOM from "react-dom"
import "../node_modules/materialize-css/dist/css/materialize.min.css"
import "../node_modules/materialize-css/dist/js/materialize.min.js"
import "./index.css"

// COPY FROM HERE

enum OpType {
  Operation,
  Digit
}

const opDef = {
  "^": { assoc: "right", prec: 4 },
  "*": { assoc: "left", prec: 3 },
  "/": { assoc: "left", prec: 3 },
  "+": { assoc: "left", prec: 2 },
  "-": { assoc: "left", prec: 2 }
}

interface HistoryElem {
  t: OpType
  v: string
}

interface State {
  h: HistoryElem[]
  result: string | number
}

class Calculator extends React.Component<any, State> {
  constructor(props: any) {
    super(props)
    this.state = this.initialState()
  }

  digit(d?: string): HistoryElem {
    return {
      t: OpType.Digit,
      v: d || ""
    }
  }

  operation(op?: string): HistoryElem {
    return {
      t: OpType.Operation,
      v: op || ""
    }
  }

  initialState(): State {
    return {
      h: [this.digit()],
      result: null
    }
  }

  last(): HistoryElem {
    return this.state.h.slice(-1)[0]
  }

  replaceLast(el: HistoryElem) {
    const h = this.state.h.slice(0, -1)
    h.push(el)
    this.setState({ h: h })
  }

  pushNewElem(el: HistoryElem) {
    const h = this.state.h.slice()
    h.push(el)
    this.setState({ h: h })
  }

  addNumber = (no: Number) => (e: React.MouseEvent<HTMLButtonElement>) => {
    const last = this.last()
    if (last.t === OpType.Digit) {
      last.v = last.v + no.toString()
      this.replaceLast(last)
    } else {
      this.pushNewElem(this.digit(no.toString()))
    }
  }

  addComma = (e: React.MouseEvent<HTMLButtonElement>) => {
    const last = this.last()
    if (last.t === OpType.Digit && !last.v.includes(".")) {
      if (!last.v.length) {
        last.v = "0"
      }
      last.v = last.v + "."
      this.replaceLast(last)
    }
  }

  addOperation = (op: String) => (e: React.MouseEvent<HTMLButtonElement>) => {
    const last = this.last()
    if (last.t === OpType.Digit && last.v.length) {
      this.pushNewElem(this.operation(`${op}`))
    }
  }

  /**
   * Create an AST from the formula
   * 1 + 2 + 3 == (+ (+ 1 2) 3
   * 1 + 2 * 3 == (+ 1 (* 2))
   */
  solveCalculation = (e: React.MouseEvent<HTMLButtonElement>) => {
    console.log("solve the beast")
    const rpn = this.parseFormula()
    const out = this.toString(rpn)

    let resultStack: number[] = []

    rpn.forEach(elem => {
      if (elem.t === OpType.Digit) {
        resultStack.push(parseFloat(elem.v))
      } else {
        const a = resultStack.pop()
        const b = resultStack.pop()
        switch (elem.v) {
          case "+":
            resultStack.push(a + b)
            break
          case "-":
            resultStack.push(b - a)
            break
          case "*":
            resultStack.push(a * b)
            break
          case "/":
            resultStack.push(b / a)
            break
          case "^":
            resultStack.push(Math.pow(b, a))
            break
          default: break
        }
      }
    })

    const result = resultStack.length !== 1 ? "ERROR" : resultStack.pop()

    console.log("solution: ", out, result)
    console.log("result is : ", result)
    const el: HistoryElem = {
      t: OpType.Digit,
      v: result.toString()
    }
    return this.setState({ h: [el] })
  }

  clearState = (e: React.MouseEvent<HTMLButtonElement>) => {
    this.setState(this.initialState())
  }

  displayStr() {
    if (this.state.result) {
      return this.state.result
    } else {
      return this.state.h.reduce((accu, h) => {
        const v = h.t === OpType.Operation ? ` ${h.v} ` : h.v
        return accu + v
      }, "")
    }
  }

  btn(no: Number, cls?: string) {
    return (
      <div className={`box ${cls}`}>
        <button className="btn waves-effect waves-light" onClick={this.addNumber(no)}>{no}</button>
      </div>
    )
  }

  commaBtn() {
    return (
      <div className="box">
        <button className="btn waves-effect waves-light" onClick={this.addComma}>,</button>
      </div>
    )
  }

  opBtn(op: String) {
    return (
      <div className="box">
        <button
          className="btn waves-effect waves-light cyan darken-2"
          onClick={this.addOperation(op)}
        >{op}
        </button>
      </div>
    )
  }

  clearBtn() {
    return (
      <div className="box">
        <button className="btn waves-effect waves-light teal darken-3" onClick={this.clearState}>CE</button>
      </div>
    )
  }

  solveBtn() {
    return (
      <div className="box btn-solve">
        <button className="btn waves-effect waves-light teal darken-3" onClick={this.solveCalculation}>=</button>
      </div>
    )
  }

  peek(stack: HistoryElem[]): HistoryElem {
    return stack.slice(-1)[0]
  }

  precedence(op: string) {
    return opDef[op].prec
  }

  associativity(op: string) {
    console.log("assoc for " + op, opDef[op])
    return opDef[op].assoc
  }

  /*
    Shunting Yard implementation taken from: 
    https://medium.freecodecamp.org/parsing-math-expressions-with-javascript-7e8f5572276e
  */
  parseFormula(): HistoryElem[] {
    let outQueue: HistoryElem[] = []
    let opStack: HistoryElem[] = []

    this.state.h.forEach(v => {
      // If the token is a number, then push it to the output queue
      if (v.t === OpType.Digit) {
        outQueue.push(v)
      } else if (v.t === OpType.Operation) {
        // If the token is an operator, o1, then:
        // while there is an operator token o2, at the top of the operator stack and either
        while (this.peek(opStack) && (this.peek(opStack).t === OpType.Operation)
          // o1 is left-associative and its precedence is less than or equal to that of o2, or
          && ((this.associativity(v.v) === "left" && this.precedence(v.v) <= this.precedence(this.peek(opStack).v))
            // o1 is right associative, and has precedence less than that of o2,
            || (this.associativity(v.v) === "right" &&
              this.precedence(v.v) < this.precedence(this.peek(opStack).v)))) {
          outQueue.push(opStack.pop())
        }
        // at the end of iteration push o1 onto the operator stack
        opStack.push(v)

        // If the token is a left parenthesis i.e. "("), then push it onto the stack.
      }
    })

    return outQueue.concat(opStack.reverse())
  }

  toString(rpn: HistoryElem[]) {
    return rpn.map(token => token.v).join(" ")
  }

  render() {
    return (
      <div id="calc-container">
        <div className="row valign-wrapper">
          <div className="col s12 valign">
            <div className="card blue-grey darken-1 z-depth-4">
              <div className="card-content white-text">
                <span className="card-title center-align">Awesome Calc</span>

                <div className="calc-grid-container">
                  <div className="box calc-display right-align">
                    <div className="display-screen">{this.displayStr()}</div>
                  </div>
                  {this.btn(7)}
                  {this.btn(8)}
                  {this.btn(9)}
                  {this.clearBtn()}

                  {this.btn(4)}
                  {this.btn(5)}
                  {this.btn(6)}
                  {this.opBtn("/")}

                  {this.btn(1)}
                  {this.btn(2)}
                  {this.btn(3)}
                  {this.opBtn("*")}

                  {this.commaBtn()}
                  {this.btn(0, "btn-zero")}
                  {this.opBtn("-")}

                  {this.solveBtn()}
                  {this.opBtn("+")}
                </div>

              </div>
            </div>
            <p className="center-align">by <a href="http://www.agynamix.de" target="_blank">Torsten Uhlmann</a></p>
          </div>
        </div>
      </div>
    )
  }
}

ReactDOM.render(
  <Calculator />,
  document.getElementById("root") as HTMLElement
)
