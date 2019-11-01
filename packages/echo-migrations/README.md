## Echo-migrations

Migrate the 0x system of smart contracts on the ECHO network with cli.

### Install dependencies

If you don't have yarn workspaces enabled (Yarn < v1.0) - enable them:

```bash
yarn config set workspaces-experimental true
```

Then install dependencies

```bash
yarn install
```

### Build

To build this package and all other monorepo packages that it depends on, run the following from the monorepo root directory:

```bash
PKG=@0x/echo-migrations yarn build
```

### Clean

```bash
yarn clean
```

### Lint

```bash
yarn lint
```

### Migrate

#### V2 smart contracts

In order to migrate the V2 0x smart contracts to TestRPC/Ganache running at `http://localhost:8545`, run:

```bash
yarn migrate:v2
```
