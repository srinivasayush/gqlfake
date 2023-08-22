# gqlfake

A CLI tool that can be used to create fake, structured data using GraphQL schemas to specify fields and data types.

## What Does it Do?

`gqlfake` inputs your GraphQL schema file, goes through
each `type`, and creates JSON objects that match
the `type`'s shape and contain fake (but realistic) data.

## Installation

To install and use `gqlfake`, you must have [Node.js](https://nodejs.org/en) installed.

We can install `gqlfake` with `npm`:
```text
npm i gqlfake --location=global
```

This command will globally install `gqlfake` so you can access the CLI tool in the terminal
from any path.

## QuickStart

Say we have a GraphQL schema file titled `schema.graphql` with the following content:
```graphql
type User {
  name: String @generate(code: "return faker.person.fullName()")
  avatar_url: String @generate(code: "return faker.internet.avatar()")
}
```

The above schema defines a `User` type with specific attributes.
Both the `name` and `avatar_url` fields use the `@generate` directive to define the kind of data that
should be generated per field. This is a custom directive that `gqlfake` parses, and does not
need to be defined in your GraphQL schema.
Inside this directive, we use the `faker.js` library to generate name and avatar data.

We can now use the following command to create a JSON file
that contains 100 such `User` objects:

```text
gqlfake generate --schema-path ./schema.graphql --num-documents 100
```

The resulting JSON file will be stored in a folder called `datagen`.

Here is an example of what this file will look like:
```json
[
  {
    "name": "Beverly Block",
    "avatar_url": "https://cloudflare-ipfs.com/ipfs/Qmd3W5DuhgHirLHGVixi6V76LhCkZUz6pnFt5AJBiyvHye/avatar/624.jpg"
  },
  {
    "name": "Wilson Zulauf",
    "avatar_url": "https://cloudflare-ipfs.com/ipfs/Qmd3W5DuhgHirLHGVixi6V76LhCkZUz6pnFt5AJBiyvHye/avatar/684.jpg"
  },
  {
    "name": "Kirk Kris",
    "avatar_url": "https://cloudflare-ipfs.com/ipfs/Qmd3W5DuhgHirLHGVixi6V76LhCkZUz6pnFt5AJBiyvHye/avatar/866.jpg"
  },
  ...97 more
]
```

Run `gqlfake --help` for more information on `gqlfake`
commands and their syntax.
