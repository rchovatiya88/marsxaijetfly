# Blender MCP setup and verified handoff

Verified on September 13, 2026. This is a local authoring connection, not part of the shipped browser game.

## Working installation

- Blender executable: `C:\Program Files\Blender Foundation\Blender 5.2\blender.exe`.
- Verified binary: **5.2.1 LTS**, build `9e2066aef7ef`, August 25, 2026.
- Supplied add-on: `C:\Users\roncho\Downloads\mcp-1.0.3`, manifest version **1.0.3**, minimum Blender **5.1.0**, GPL-3.0-or-later.
- Official MCP server source: `C:\Users\roncho\.codex\tools\blender-mcp-official`, cloned from `https://projects.blender.org/lab/blender_mcp.git`, commit `ff54e4d8f6b09502f2f466189cca0e52b4a91643`.
- Server package metadata reports **blender-mcp 1.0.2**; dependency is **mcp 1.30.0**. These are separate version numbers from the add-on. The MCP initialize response reports the SDK version (1.30.0), not the add-on version.
- Dedicated Python 3.12.5 environment: `C:\Users\roncho\.codex\tools\blender-mcp-venv`.

The supplied download contains the Blender-side socket bridge only. The separate official Python server supplies MCP protocol transport and its tools. No third-party package with a similar name was substituted.

## Codex connection

Global server **blender_official** is enabled in `C:\Users\roncho\.codex\config.toml`. It uses:

```toml
[mcp_servers.blender_official]
command = 'C:\Users\roncho\.codex\tools\blender-mcp-venv\Scripts\blender-mcp.exe'
args = ["--transport", "stdio"]

[mcp_servers.blender_official.env]
BLENDER_MCP_HOST = "127.0.0.1"
BLENDER_MCP_PORT = "9876"
BLENDER_PATH = 'C:\Program Files\Blender Foundation\Blender 5.2\blender.exe'
```

The existing config was backed up to `C:\Users\roncho\.codex\config.toml.before-blender-20260913-1248.bak` before using `codex mcp add`. Other server settings were preserved. No credentials were needed.

The currently open GUI Blender already had a working bridge listening on **127.0.0.1:9876**. It contains an unsaved, clean default scene with three objects, one mesh, one camera and one light. The setup did not replace this scene or write Blender preferences. It did not reinstall the already functioning GUI add-on.

The current Codex conversation's tool catalog may require a Codex restart or new session to expose the newly configured tools. Configuration and a real end-to-end MCP client connection were verified; native tool discovery inside this already-running conversation was not claimed.

## Verification and repeatable checks

The following probe initialized MCP, discovered **26 tools**, and successfully called `get_blendfile_summary_path_info` and `get_blendfile_summary_datablocks` through stdio and the live Blender socket. Both calls returned `status: ok` and `isError: false`.

```powershell
codex mcp get blender_official
& 'C:\Users\roncho\.codex\tools\blender-mcp-venv\Scripts\python.exe' 'C:\Users\roncho\.codex\tools\blender-mcp-probe.py'
```

Tools include Python execution, object/collection summaries, missing-file analysis, API/manual search, viewport navigation and rendering. GUI screenshots need an interactive Blender context. Background operations do not support deferred responses.

## Isolated scene authoring

A second, isolated Blender process was tested on **127.0.0.1:9877**, using the supplied 1.0.3 add-on loaded only into that process. Its query returned Blender 5.2.1 LTS, `background: true`, and three default objects. The process launched during setup had PID **19588**; do not assume that PID remains valid in later sessions.

The task-owned background process was stopped after authoring and verification, with executable/command-line checks. The GUI bridge on 9876 remains the configured connection. Use the bootstrap below only when a new isolated authoring process is needed.

Bootstrap: `C:\Users\roncho\.codex\tools\blender-mcp-background.py`.

```powershell
$ridgeBlender = Start-Process -FilePath 'C:\Program Files\Blender Foundation\Blender 5.2\blender.exe' -ArgumentList '--background --factory-startup --online-mode --python C:\Users\roncho\.codex\tools\blender-mcp-background.py' -WindowStyle Hidden -PassThru
$ridgeBlender.Id
```

Check port 9877 first; do not launch duplicates. For an MCP client targeting this process, set `BLENDER_MCP_PORT=9877`. The global Codex server deliberately continues to point at the user-visible GUI on 9876. The bootstrap does not save preferences, install an add-on globally, or save a blend file. Retain the supplied Downloads folder while using this bootstrap.

Use this separate process for importing supplied GLBs, building Ridge Run collections, rendering review images and exporting derived files. Importing into the unsaved GUI must be a deliberate action. Save editable `.blend` sources and export new GLB paths; preserve originals. The socket bridge can execute Python with the user's permissions and is not a security sandbox; keep it bound to loopback.

## Manual fallback and export handoff

If the GUI bridge is stopped, open Blender Preferences → Add-ons → MCP and use **Start MCP Bridge Server**. This official add-on requires Blender's Online Access setting. If the add-on is absent on another machine, install the official zip from disk through Preferences, then enable it. Its repository installation also supports updates.

If MCP is unavailable, normal Blender Python batch scripts remain sufficient for import, assembly, render and export:

```powershell
& 'C:\Program Files\Blender Foundation\Blender 5.2\blender.exe' --background --factory-startup --python 'C:\path\to\reviewed-ridge-export.py'
```

For human handoff, open the authored `.blend`, inspect route scale and landmarks, then export selected render collections using File → Export → glTF 2.0, format **glTF Binary (.glb)**. Export collision geometry and route markers separately under the project's asset contract. Apply an intentional coordinate/unit convention, validate exported bytes and material/image references, then test in the browser runtime. Blender import success alone does not validate gameplay collision, frame time or player readability.

To remove only this Codex connection: `codex mcp remove blender_official`. Stop an isolated process only after confirming its executable and command line match this bootstrap; do not close the user's Blender GUI as cleanup.

## Primary sources

- [Blender Lab MCP overview](https://www.blender.org/lab/mcp-server/): separate add-on and server requirements, Blender version prerequisite and execution model.
- [Official source](https://projects.blender.org/lab/blender_mcp): `readme.md`, `readme_local_llm.rst`, server connection helper and supplied add-on source were inspected locally.
- [Codex MCP configuration](https://developers.openai.com/codex/mcp): stdio command/args/environment configuration and server registration.
