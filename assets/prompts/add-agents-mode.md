Create an additional step to the migration process, described in assets/prompts/M-COPY-AND-TRANSLATE.mdk. 

That is a step related to gsd-opencode/agents folder only. 

The step must perform additional changes to all agent definitions (.md files in gsd-opencode/agents) using 'standard' assets/bin/gsd-translate-in-place.js scipt.

The script should be provided with additional config file - add-agent-mode.json which will define the procedure.

The procedure itself is relatively simple: every agent definition header shuld be updated and a line:

``` yaml
mode: subagent
```
should be added after the line with 

``` yaml
description: <some description>
```
