---
title: Overview of the Nx Nuxt Plugin
description: The Nx Plugin for Nuxt contains generators for managing Nuxt applications within a Nx workspace. This page also explains how to configure Nuxt on your Nx workspace.
---

The Nx plugin for [Nuxt](https://nuxt.com/).

## Setting up a new Nx workspace with Nuxt

You can create a new workspace that uses Nuxt with one of the following commands:

- Generate a new monorepo with a Nuxt app

```shell
npx create-nx-workspace@latest --preset=nuxt
```

## Add Nuxt to an existing workspace

There are a number of ways to use Nuxt in your existing workspace.

### Install the `@nx/nuxt` plugin

{% tabs %}
{% tab label="npm" %}

```shell
npm install -D @nx/nuxt
```

{% /tab %}
{% tab label="yarn" %}

```shell
yarn add -D @nx/nuxt
```

{% /tab %}
{% tab label="pnpm" %}

```shell
pnpm install -D @nx/nuxt
```

{% /tab %}
{% /tabs %}

### Generate a new Nuxt app

```shell
nx g @nx/nuxt:app my-app
```
