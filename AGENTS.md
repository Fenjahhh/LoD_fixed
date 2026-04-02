# AGENTS.md

## Cursor Cloud specific instructions

### Project Overview

Daemon Hunter is a single-file, zero-dependency, browser-based 2D lane battle game. The entire codebase is one `index.html` file containing inline CSS, JavaScript (vanilla ES6+), and HTML5 Canvas rendering. There is no build step, no package manager, and no backend.

### Running the Application

Serve `index.html` with any static file server:

```sh
python3 -m http.server 8080
```

Then open `http://localhost:8080/index.html` in Chrome.

### Notes

- There is no linting, testing framework, or build toolchain — none is needed for this single-file project.
- The UI is in German. Key terms: "Dein Dämon" = Your Daemon, "Gegnerischer Dämon" = Enemy Daemon, "Neue Creep-Wave!" = New Creep Wave.
- The game starts automatically on page load; no start button is required.
- The update script is intentionally empty (`echo ok`) since there are no dependencies to install.
