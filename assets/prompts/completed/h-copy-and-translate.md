This is a meta prompt. 


## Step 10

The task is to use 'copy-service' (assets/bin/gsd-copy-from-original.js) defined in assets/bin/GSD-COPY-FROM-ORIGINAL.md file to copy all files reated to Get-Shit-Done system (original/get-shit-done) to the working folder gsd-opencode/

``` bash
node assets/bin/gsd-copy-from-original.js --apply 
```

Make sure that we copied all the necessary files. Provide report and evidence.

Do not replace any file or folder with oc- or -oc- in the name.


## Step 20

The task is to use 'translate-service' (assets/bin/gsd-translate-in-place.js) defined in assets/bin/GSD-TRANSLATE-IN-PLACE.md file to replase Claude Code artifacts with OpenCode related options.

The translation must be done in place, in the gsd-opencode/ folder. 

### Show changes 

``` bash
node assets/bin/gsd-translate-in-place.js assets/configs/config.json <additional_config_file_if_necessary> --show-diff
```

### Apply changes

``` bash
node assets/bin/gsd-translate-in-place.js assets/configs/config.json <additional_config_file_if_necessary> --apply
```


Do not replace or update any file or folder with oc- or -oc- in the name.

## Step 30

The task is to check is there are any antipattern exist.

The tool is assets/bin/check-forbidden-strings.js. The documentation: assets/bin/CHECK-FORBIDDEN-STRINGS.md

``` bash
node assets/bin/check-forbidden-strings.js
```

Parse the results. 

**If you found any forbidden sting in the output** 
 - create an addtionional config file in `assets/config/` folder with the name, relevant to the current version of the `original/get-shit-done` system. 
 For example, if the current version is v1.22.4, so the config file should be `assets/config/v1.22.4.json`. 
 
 - Go back and execute step 20 with `assets/config/v1.22.4.json` as additional config file

**If you did not find any forbidden string in the output**

Create the report, provide statistic about performed work
