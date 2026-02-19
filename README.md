# weweb-kanban-component

This project is configured as a WeWeb custom component package.

## Install

```sh
npm install
```

## Serve (local WeWeb dev)

```sh
npm run serve -- port=8080
```

Then add this local component from the WeWeb developer popup.

## Build

Use WeWeb build arguments:

```sh
npm run build -- name=ww-kanban-vue type=wwobject
```

- `name`: output package name
- `type`: `wwobject`, `section`, or `plugin`
