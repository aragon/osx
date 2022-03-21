export function customError (errorName: string, ...args: any[]){

  let argumentString = '';

  if(Array.isArray(args) && args.length) {

    // add quotation marks to first argument if it is of string type
    if (typeof args[0] === 'string') {
      args[0] = `"${args[0]}"`
    }

    // add joining comma and quotation marks to all subsequent arguments, if they are of string type
    argumentString = args.reduce(function (acc: string, cur: any) {
      if (typeof cur === 'string')
        return `${acc}, "${cur}"`
      else
        return `${acc}, ${cur.toString()}`;
    })
  }

  return `'${errorName}(${argumentString})'`
}
