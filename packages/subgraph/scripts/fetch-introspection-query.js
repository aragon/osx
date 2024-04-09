const fs = require('fs');
const fetch = require('node-fetch');

const url = process.argv[2];
const filename = process.argv[3];
console.log(url, filename);

fetchIntrospectionQuery(url, filename).catch(e => {
  console.error(e);
  process.exit(1);
});

async function fetchIntrospectionQuery(
  url,
  filename = 'introspection-query.json'
) {
  console.log('Fetching introspection query...');
  const query = `
    fragment FullType on __Type {
      kind
      name
      fields(includeDeprecated: true) {
        name
        args {
          ...InputValue
        }
        type {
          ...TypeRef
        }
        isDeprecated
        deprecationReason
      }
      inputFields {
        ...InputValue
      }
      interfaces {
        ...TypeRef
      }
      enumValues(includeDeprecated: true) {
        name
        isDeprecated
        deprecationReason
      }
      possibleTypes {
        ...TypeRef
      }
    }
    fragment InputValue on __InputValue {
      name
      type {
        ...TypeRef
      }
      defaultValue
    }
    fragment TypeRef on __Type {
      kind
      name
      ofType {
        kind
        name
        ofType {
          kind
          name
          ofType {
            kind
            name
            ofType {
              kind
              name
              ofType {
                kind
                name
                ofType {
                  kind
                  name
                  ofType {
                    kind
                    name
                  }
                }
              }
            }
          }
        }
      }
    }
    query IntrospectionQuery {
      __schema {
        queryType {
          name
        }
        mutationType {
          name
        }
        types {
          ...FullType
        }
        directives {
          name
          locations
          args {
            ...InputValue
          }
        }
      }
    }
  `;
  const res = await fetch(url, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      query,
    }),
  });
  const {data} = await res.json();
  fs.writeFileSync(filename, JSON.stringify(data, null, 2));
  console.log(`Wrote introspection query to ${filename}`);
}
