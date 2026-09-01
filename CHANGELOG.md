# Changelog

## [2.4.0](https://github.com/marcomoi395/word2card/compare/v2.3.0...v2.4.0) (2026-07-18)


### Features

* **main:** added filename sanitization to audio file generation ([5fb0f8b](https://github.com/marcomoi395/word2card/commit/5fb0f8b998f32204f4747be2321ce769c6abb50c))

## [2.3.0](https://github.com/marcomoi395/word2card/compare/v2.2.0...v2.3.0) (2026-05-06)

### Features

- add .gitignore and update app metadata in electron-builder.yml ([ace2cab](https://github.com/marcomoi395/word2card/commit/ace2cab65032ecf6018eadd39e8711428ce7d0cb))
- add a limit parameter ([90f7bb6](https://github.com/marcomoi395/word2card/commit/90f7bb61f99cec5f791844e36e1f78e7983602c5))
- add CI/CD workflows for automated release and build processes ([48fc15c](https://github.com/marcomoi395/word2card/commit/48fc15c362296af050cb19da30a5d39c4a88718d))
- **anki:** add AnkiConnect interface and request handling functions ([ff925c0](https://github.com/marcomoi395/word2card/commit/ff925c010f594b39eb5ee94b11250377032474b0))
- **card:** add model flashcard interface and JSON data for Anki cards ([5b32818](https://github.com/marcomoi395/word2card/commit/5b32818d3de4bc45a79cf1b551d3af85beafcf7b))
- **config:** add vite-plugin-static-copy for JSON file handling and update product name ([d72663b](https://github.com/marcomoi395/word2card/commit/d72663b4d99359ed68aa2c2b059b57127175940b))
- **config:** update formatting and linting configurations for improved code quality ([d9788f3](https://github.com/marcomoi395/word2card/commit/d9788f3136369a2b5e0cac1d594c840f127d2602))
- create card from txt ([77ba41e](https://github.com/marcomoi395/word2card/commit/77ba41e60c6a8b78c3f9c5363a6aeb199300cd73))
- **dialog:** add open file dialog functionality and OpenFileResponse interface ([2496205](https://github.com/marcomoi395/word2card/commit/2496205290682acedb0e829b5e7371723c66b534))
- enhance Notion integration with target management and deck resolution ([442dae3](https://github.com/marcomoi395/word2card/commit/442dae345d99dc63d229e188cd70d449876d13e3))
- **fetch:** add example field to fetched items and update README with new format ([590f60a](https://github.com/marcomoi395/word2card/commit/590f60a58a7dc918de18598001f0c9d6c8dd5665))
- **filter:** add function to filter out existing words from input ([d637534](https://github.com/marcomoi395/word2card/commit/d6375340cec03e7d268e575651d2e8f54b69f512))
- **flashcard:** integrate Unsplash image search and add access key handling ([46a7582](https://github.com/marcomoi395/word2card/commit/46a75826c2700677b5870516ca318cd9922b26fa))
- **flashcards:** add cloze deletion support for flashcard words ([00defbb](https://github.com/marcomoi395/word2card/commit/00defbb95a32823d823055232a8636bbb4955d06))
- **flashcards:** add functionality to create flashcards with audio support and customizable settings ([d645c1c](https://github.com/marcomoi395/word2card/commit/d645c1c38d979922c8812f776c7a22fa46b7e58e))
- **flashcard:** update front template for improved visibility settings and user interaction ([b5db843](https://github.com/marcomoi395/word2card/commit/b5db843e1b26b126967fa5d0eac5c41e2934c02f))
- **import:** add deck input field to FileImport and NotionSync forms ([ad67e9e](https://github.com/marcomoi395/word2card/commit/ad67e9edc1f0a31a9ecf88d7397ed2f0206e7b60))
- **import:** enhance import functionality with audio directory initialization ([31f53da](https://github.com/marcomoi395/word2card/commit/31f53da025f3b318c5f19c028db646101032cddf))
- **import:** integrate speech service for audio file creation during import ([1bbc283](https://github.com/marcomoi395/word2card/commit/1bbc283a5566e40914f8e48844e86de98fdc4775))
- initialize Electron application with TypeScript ([6ebba91](https://github.com/marcomoi395/word2card/commit/6ebba91db2864001daf7a71b5588cbc9e74d5418))
- **notion:** add Notion token and database ID fields to settings and update handling logic ([0a13694](https://github.com/marcomoi395/word2card/commit/0a13694223587b8086f520df825a98beff3c4a94))
- **notion:** enhance Notion sync functionality and add helper for processing response ([d061bbb](https://github.com/marcomoi395/word2card/commit/d061bbb460098ee8ed747068587e2ddc6384637c))
- **notion:** handle empty pages response from Notion database ([1c06bbc](https://github.com/marcomoi395/word2card/commit/1c06bbc07f4103efef846639c65bea325e80cb95))
- **notion:** improve error handling in Notion data retrieval processes ([c135b38](https://github.com/marcomoi395/word2card/commit/c135b388531ee33393de39a72298f335c2e91dff))
- **notion:** integrate Notion API client and add service for fetching pages ([d701c35](https://github.com/marcomoi395/word2card/commit/d701c35a58c9a07311e0b37071ac929394f92846))
- **notion:** integrate Notion page updates during flashcard generation ([cceec07](https://github.com/marcomoi395/word2card/commit/cceec070025d502771eff1aecb042d7d76f47277))
- **notion:** set token before retrieving pages in Notion sync process ([e638470](https://github.com/marcomoi395/word2card/commit/e6384704c1424b15f5e1319342911fa5a1098f5d))
- **notion:** update NotionService to retrieve data source and refactor getPages method ([b0996d0](https://github.com/marcomoi395/word2card/commit/b0996d059840512a41dfc0eee92db3668bab5a94))
- **open-ai:** add example field to word data structure and update example interactions ([ae13be0](https://github.com/marcomoi395/word2card/commit/ae13be099aa814e62d66ca0b1a394621c22106c8))
- **open-ai:** add reasoning_effort parameter for minimal processing ([75d451f](https://github.com/marcomoi395/word2card/commit/75d451f07da819bc031fb95640ae67d6115a3871))
- **openai:** implement OpenAI service for generating flashcard data ([0b47a76](https://github.com/marcomoi395/word2card/commit/0b47a764f19b688e3c67f940e61cf96d3ddc4d86))
- **options:** add isAudio parameter to multipleChoice, EnglishToVietnamese, and VietnameseToEnglish functions for audio handling ([594a72e](https://github.com/marcomoi395/word2card/commit/594a72eb7a6f665a2e9a28b51774498faef6e36e))
- **package:** rename application from v2_temp to word2card ([b0e54dd](https://github.com/marcomoi395/word2card/commit/b0e54dd05b898b8c2429e8aa6e33d89836c0cb15))
- **pexels:** integrate Pexels API for image search and update access key references ([309363f](https://github.com/marcomoi395/word2card/commit/309363fcb78697915b95182a0b250d8fe717c044))
- **readFile:** enhance file reading by trimming lines and filtering empty entries ([7ae2f4a](https://github.com/marcomoi395/word2card/commit/7ae2f4a55dc426ec715ad0df34514528608603c5))
- **readFile:** improve file import handling and filter existing words ([fcd1b32](https://github.com/marcomoi395/word2card/commit/fcd1b32b377bbccbdc6abb02f61a5b002e15449b))
- **renderer:** add loading state management for buttons during import and sync processes ([94c9aa5](https://github.com/marcomoi395/word2card/commit/94c9aa577a04746bc1ab4911f4d068c1758ea6a9))
- **renderer:** add user alerts for settings save success and failure ([0532d6f](https://github.com/marcomoi395/word2card/commit/0532d6f42e5e67f29eba75d8b19aec4e718b90d2))
- **renderer:** implement file import and Notion sync forms with drag-and-drop support ([bba865d](https://github.com/marcomoi395/word2card/commit/bba865d121f244f8210d0336cca67d492fe36fb5))
- **renderer:** remove azure key inputs from import and notion sections ([f7e2d7d](https://github.com/marcomoi395/word2card/commit/f7e2d7da6c43d95eda42bf11540d8e031da06af6))
- **settings:** add logic to delete API keys when not provided ([9eea71b](https://github.com/marcomoi395/word2card/commit/9eea71b424b9ae71e5bdc3e8ce3000c1680f2dea))
- **settings:** add saveSettings and getSecret methods, update DataResponse structure ([b5968a6](https://github.com/marcomoi395/word2card/commit/b5968a6807ee95045185eb52b52bf0269118306a))
- **speech:** add file existence check before synthesizing audio ([7bd7595](https://github.com/marcomoi395/word2card/commit/7bd75952375d8cb7bbb7f7f5c764dde34bef9ebc))
- **speech:** implement Azure Speech service for text-to-speech synthesis with retry logic ([d596846](https://github.com/marcomoi395/word2card/commit/d5968462c3c8d0b1a448a1c520f14ffac0652e99))
- **state:** implement singleton State class for managing tokens ([e8dc2ea](https://github.com/marcomoi395/word2card/commit/e8dc2ea10d89b4b4b5cae749ae24087e0551efce))
- **state:** update API key handling to use State for OpenAI and Azure keys ([dfc7ee7](https://github.com/marcomoi395/word2card/commit/dfc7ee7e144fa03217b8eb47ceed26f9788526e4))
- support for json file and change theme so beautiful ([b6d09c7](https://github.com/marcomoi395/word2card/commit/b6d09c72853f7f54f8fb1bf1ce1171c145795a35))
- **ui:** enhance HTML structure and styling for improved user experience ([a1d22ff](https://github.com/marcomoi395/word2card/commit/a1d22ff7f906264a0054757b45afc349cf07173f))
- **ui:** enhance layout and styling for improved user experience ([cdc5fb1](https://github.com/marcomoi395/word2card/commit/cdc5fb164b72e1b315b1e45042417af1b326f3e1))
- **ui:** fix turn off dev tool and change some html ([617213e](https://github.com/marcomoi395/word2card/commit/617213e55d6a8e7718423e68ffdf2edf79d11ebc))
- update application name to Word2Card and bump version to 2.0.0 ([fed9f1f](https://github.com/marcomoi395/word2card/commit/fed9f1ff1e0205f55088df7850d94a30788691e8))
- update README with application overview, key features, and installation instructions ([331513d](https://github.com/marcomoi395/word2card/commit/331513dfe6b830026fc63c69ae15f72580b1328d))
- **window:** add minimize and close functionality for the main window ([af7cc0e](https://github.com/marcomoi395/word2card/commit/af7cc0e52d0139eeae7129b9af7c780d774f3ea8))

### Bug Fixes

- **electron.config:** use path.resolve for JSON file source ([9ebaedc](https://github.com/marcomoi395/word2card/commit/9ebaedc0b69ca6301caec8924ac8666566f4c584))
- **workflows:** renamed reusable workflow token input ([4e93f54](https://github.com/marcomoi395/word2card/commit/4e93f5486b88a60f2168bb36442ed94e6a30d033))

## [2.2.0](https://github.com/marcomoi395/word2card/compare/v2.1.0...v2.2.0) (2026-05-06)

### Features

- add .gitignore and update app metadata in electron-builder.yml ([ace2cab](https://github.com/marcomoi395/word2card/commit/ace2cab65032ecf6018eadd39e8711428ce7d0cb))
- add CI/CD workflows for automated release and build processes ([48fc15c](https://github.com/marcomoi395/word2card/commit/48fc15c362296af050cb19da30a5d39c4a88718d))

### Bug Fixes

- **workflows:** renamed reusable workflow token input ([4e93f54](https://github.com/marcomoi395/word2card/commit/4e93f5486b88a60f2168bb36442ed94e6a30d033))
