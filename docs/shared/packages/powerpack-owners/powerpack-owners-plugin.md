---
title: Overview of the Nx powerpack-owners Plugin
description: The Nx Powerpack Owners plugin provides the ability to define code ownership based on projects in addition to files
---

The `@nx/powerpack-owners` plugin extends the CODEOWNERS functionality to allow you to define code ownership based on projects in addition to the standard file-based definitions. It leverages the [`nx sync`](/concepts/sync-generators) command to compile `owners` configuration settings from `nx.json` and project configuration files into valid CODEOWNERS files for [GitHub](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners), [Bitbucket](https://support.atlassian.com/bitbucket-cloud/docs/set-up-and-use-code-owners/) or [GitLab](https://docs.gitlab.com/ee/user/project/codeowners/).

With this plugin, you can specify code ownership using the same project glob syntax as [`nx run-many`](/nx-api/nx/documents/run-many#examples). This allows you to easily define rules for multiple projects that may not be located in the same directory. Also, the CODEOWNERS rules will not need to be revisited if a project location is changed or a new project is added.

{% callout title="This plugin requires an active Nx Powerpack license" %}
In order to use `@nx/powerpack-owners`, you need to have an active Powerpack license. If you don't have a license or it has expired, the syncing process will stop working and you'll need to manually maintain your CODEOWNERS file.
{% /callout %}

## Setup

1. [Activate Powerpack](/recipes/installation/activate-powerpack) if you haven't already
2. Install the package

```shell
nx add @nx/powerpack-owners
```

3. Configure Ownership

Configure the `@nx/powerpack-owners` plugin in the `nx.json` file and, optionally, in individual project configuration files. Consult the [Owners Configuration Reference](#owners-configuration-reference) section for more details.

4. Configure the [Sync Generator](/concepts/sync-generators) and CI

Make sure that the `@nx/powerpack-owners:sync-codeowners-file` generators is registered as a `globalGenerator` in `nx.json`:

```jsonc {% fileName="nx.json" %}
{
  "sync": {
    "globalGenerators": ["@nx/powerpack-owners:sync-codeowners-file"]
  }
}
```

Add `nx sync:check` to the beginning of the CI process.

```yaml
- name: Ensure the workspace configuration is in sync
  run: npx nx sync:check
```

It is also often helpful to add `nx sync` as a git push hook or git commit hook.

## Owners Configuration Reference

{% tabs %}
{% tab label="GitHub or Bitbucket" %}

```jsonc {% fileName="nx.json" %}
{
  "owners": {
    // Can be set to true instead of an object to accept all defaults
    "format": "github", // Options are `github`, `bitbucket` or `gitlab`. (Optional) Defaults to `github`
    "outputPath": "tools/CODEOWNERS", // (Optional) Default changes based on format: `.github/CODEOWNERS`, `.bitbucket/CODEOWNERS`, `.gitlab/CODEOWNERS`
    "patterns": [
      // (Optional)
      {
        "description": "A description of the rule",
        "owners": ["@joelovesrust"],
        // specify either projects or files, not both
        "projects": ["my-rust-app", "rust-*", "tag:rust"], // Can be any project specifier that could be used in `nx run-many`
        // See https://nx.dev/nx-api/nx/documents/run-many
        "files": [".github/workflows/**/*"] // File globs
      }
    ]
  }
}
```

{% /tab %}
{% tab label="GitLab" %}

If you are using GitLab, you can specify CODEOWNERS [sections](https://docs.gitlab.com/ee/user/project/codeowners/#organize-code-owners-by-putting-them-into-sections) which give you a little more control over the PR process.

```jsonc {% fileName="nx.json" %}
{
  "owners": {
    // Can be set to true instead of an object to accept all defaults
    "format": "gitlab", // Options are `github`, `bitbucket` or `gitlab`. (Optional) Defaults to `github`
    "outputPath": "tools/CODEOWNERS", // (Optional) Default changes based on format: `.github/CODEOWNERS`, `.bitbucket/CODEOWNERS`, `.gitlab/CODEOWNERS`
    // (Optional)
    "patterns": [
      {
        "description": "A description of the rule",
        "owners": ["@joelovesrust"],
        // Specify either `projects` or `files`, not both
        "projects": ["my-rust-app", "rust-*", "tag:rust"], // Can be any project specifier that could be used in `nx run-many`
        // See https://nx.dev/nx-api/nx/documents/run-many
        "files": [".github/workflows/**/*"] // File globs
      }
    ],
    // (Optional)
    "sections": [
      {
        "name": "My section", // Labels the section
        "defaultOwners": ["@cheddar"], // (Optional) The owners to use if a pattern does not specify a set of owners
        // Specify either `numberOfRequiredApprovals` or `optional`, not both
        "numberOfRequiredApprovals": 2, // (Optional) Require more than one person to approve the PR
        "optional": true, // (Optional) Do not require any approvals, just notify the owners
        "patterns": [] // Same format as the root patterns
      }
    ]
  }
}
```

```jsonc {% fileName="path/to/project/project.json" %}
{
  "owners": {
    // Keys are file globs relative to the root of the project
    "**/*": ["@ahmed", "@petra"], // Owners can be listed as a string array
    "README.md": {
      // Owners can be listed as an object with a description
      "description": "Jared is very particular about the README file",
      "owners": ["@jared"]
    }
  }
};
```

{% /tab %}
{% /tabs %}

**Examples:**

{% tabs %}
{% tab label="GitHub" %}

```jsonc {% fileName="nx.json" %}
{
  "owners": {
    "format": "github", // defaults to "github"
    "outputPath": "tools/CODEOWNERS", // defaults to ".github/CODEOWNERS"
    "patterns": [
      {
        "description": "Joe should double check all changes to rust code",
        "projects": ["tag:rust"],
        "owners": ["@joelovesrust"]
      },
      {
        "description": "The Finance team owns these projects",
        "projects": ["finance-*"],
        "owners": ["@finance-team"]
      },
      {
        "description": "Alice, Bob and Cecil work together on these projects",
        "projects": ["admin", "booking", "cart"],
        "owners": ["@alice", "@bob", "@cecil"]
      },
      {
        "description": "CI Workflows",
        "files": [".github/workflows/**/*"],
        "owners": ["@devops"]
      }
    ]
  }
}
```

```jsonc {% fileName="packages/my-project/project.json" %}
{
  "owners": {
    "**/*": ["@ahmed", "@petra"],
    "package.json": ["@ahmed"],
    "README.md": [{
      "owners": "@jared",
      "description": "Jared is very particular about the README file"
    }]
  },
};
```

{% /tab %}
{% tab label="Bitbucket" %}

```jsonc {% fileName="nx.json" %}
{
  "owners": {
    "format": "bitbucket",
    "outputPath": "tools/CODEOWNERS", // defaults to ".bitbucket/CODEOWNERS"
    "patterns": [
      {
        "description": "Joe should double check all changes to rust code",
        "projects": ["tag:rust"],
        "owners": ["@joelovesrust"]
      },
      {
        "description": "The Finance team owns these projects",
        "projects": ["finance-*"],
        "owners": ["@finance-team"]
      },
      {
        "description": "Alice, Bob and Cecil work together on these projects",
        "projects": ["admin", "booking", "cart"],
        "owners": ["@alice", "@bob", "@cecil"]
      },
      {
        "description": "CI Workflows",
        "files": [".github/workflows/**/*"],
        "owners": ["@devops"]
      }
    ]
  }
}
```

```jsonc {% fileName="packages/my-project/project.json" %}
{
  "owners": {
    "**/*": ["@ahmed", "@petra"],
    "package.json": ["@ahmed"],
    "README.md": [{
      "owners": "@jared",
      "description": "Jared is very particular about the README file"
    }]
  },
};
```

{% /tab %}
{% tab label="GitLab" %}

```jsonc {% fileName="nx.json" %}
{
  "owners": {
    "format": "gitlab",
    "outputPath": "tools/CODEOWNERS", // defaults to ".gitlab/CODEOWNERS"
    "patterns": [
      {
        "description": "Joe should double check all changes to rust code",
        "projects": ["tag:rust"],
        "owners": ["@joelovesrust"]
      },
      {
        "description": "CI Workflows",
        "files": [".github/workflows/**/*"],
        "owners": ["@devops"]
      }
    ],
    "sections": [
      {
        "name": "Finance",
        "defaultOwners": ["@finance-team"],
        "numberOfRequiredApprovals": 2,
        "patterns": [
          {
            "description": "The Finance team owns these projects",
            "projects": ["finance-*"]
          },
          {
            "description": "Alice, Bob and Cecil work together on these projects",
            "projects": ["admin", "booking", "cart"],
            "owners": ["@alice", "@bob", "@cecil"]
          }
        ]
      }
    ]
  }
}
```

```jsonc {% fileName="packages/my-project/project.json" %}
{
  "owners": {
    "**/*": ["@ahmed", "@petra"],
    "package.json": ["@ahmed"],
    "README.md": [{
      "owners": "@jared",
      "description": "Jared is very particular about the README file"
    }]
  },
};
```

{% /tab %}
{% /tabs %}