# `.gitignore` Rules by Stack

Use the universal rules first, then add the stack-specific sections that match
the repository.

Privacy filtering is mandatory. Before a repo is pushed to GitHub, check whether
the project contains secrets, private local config, machine-specific metadata,
temporary exports, logs, caches, or personal notes that do not belong in a public
repository.

Prefer precise rules over broad patterns that could hide real project files.

---

## Universal

```gitignore
# === OS files ===
.DS_Store
Desktop.ini
Thumbs.db
._*

# === Editor / IDE ===
.idea/
*.swp
*.swo
*~
.project
.classpath
.settings/

# === Environment & secrets ===
.env
.env.*
!.env.example
*.pem
*.key
*.p12
*.crt
credentials.json
secrets.*
service-account*.json

# === Logs and temp files ===
*.log
tmp/
.tmp/
.cache/
```

### Privacy-sensitive examples to review explicitly

These are not always ignored automatically. Check whether they are local-only,
secret-bearing, or intentionally shared before deciding:

- `.cursor/`
- `.vscode/`
- `.claude/`
- `*.sqlite`
- `*.db`
- `*.sql`
- `*.dump`
- `exports/`
- `backups/`
- `notes/`
- `scratch/`

If such files are already tracked and appear private, warn the user before any
push or publication step.

---

## Node / JavaScript / TypeScript

```gitignore
# === Dependencies ===
node_modules/

# === Build output ===
dist/
build/
.next/
.nuxt/
.output/
out/
.svelte-kit/

# === Cache ===
.parcel-cache/
.turbo/
.eslintcache
tsconfig.tsbuildinfo

# === Coverage ===
coverage/
.nyc_output/
```

Do not ignore: `package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`

---

## Python

```gitignore
# === Bytecode ===
__pycache__/
*.py[cod]
*$py.class

# === Virtual environments ===
.venv/
venv/
env/
.python-version

# === Distribution ===
dist/
build/
*.egg-info/
*.egg

# === Cache ===
.mypy_cache/
.ruff_cache/
.pytest_cache/
.coverage
htmlcov/

# === Jupyter ===
.ipynb_checkpoints/
```

Do not ignore: `poetry.lock`, `uv.lock`, `Pipfile.lock`, `requirements.txt`

---

## Rust

```gitignore
# === Build ===
target/

# === Debug backups ===
**/*.rs.bk
```

For Rust applications, commit `Cargo.lock`. For libraries, follow the project's
published policy.

---

## Go

```gitignore
# === Binary output ===
/bin/
*.exe
*.exe~
*.dll
*.so
*.dylib

# === Test output ===
*.test
*.out
coverage.txt
```

Do not ignore: `go.sum`

---

## Java / Kotlin / JVM

```gitignore
# === Build ===
target/
build/
*.class
*.jar
*.war

# === Gradle ===
.gradle/
!gradle-wrapper.jar

# === Maven ===
.mvn/repository/
```

---

## Docker

```gitignore
# === Docker local overrides ===
docker-compose.override.yml
.docker/
```

Do not ignore: `Dockerfile`, `docker-compose.yml`

---

## Terraform

```gitignore
.terraform/
*.tfstate
*.tfstate.*
crash.log
*.tfvars
!*.tfvars.example
```

Review whether `.terraform.lock.hcl` should stay tracked in this repo. Do not
drop it blindly.

---

## C / C++

```gitignore
# === Build ===
*.o
*.obj
*.a
*.lib
*.so
*.dylib
*.dll
*.exe
build/
cmake-build-*/
CMakeFiles/
CMakeCache.txt
```
