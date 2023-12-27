import { getConfiguration, setConfiguration } from "../configuration";

const deleteCode = require('./deleteCode');
const executeVSCodeCommand = require('./executeVscodeCommand');
const formatCode = require('./formatCode');
const navigateTo = require('./navigateTo');
const openFile = require('./openFile');
const openFolder = require('./openFolder');
const readActiveFile = require('./readActiveFile');
const replaceCode = require('./replaceCode');

const config = getConfiguration('puck');
if(Object.keys(config).length === 0) {
    config.openai_api_key = process.env.OPENAI_API_KEY;
    config.model = 'gpt-4-1106-preview';
    setConfiguration('puck', config);
}
const baseTools: any = require('@nomyx/assistant-tools')(config);

const tools: any = {
    deleteCode: deleteCode.function,
    executeVSCodeCommand: executeVSCodeCommand.function,
    formatCode: formatCode.function,
    navigateTo: navigateTo.function,
    openFile: openFile.function,
    openFolder: openFolder.function,
    readActiveFile: readActiveFile.function,
    replaceCode: replaceCode.function
};

const schemas = [
    deleteCode.schema,
    executeVSCodeCommand.schema,
    formatCode.schema,
    navigateTo.schema,
    openFile.schema,
    openFolder.schema,
    readActiveFile.schema,
    replaceCode.schema
];

module.exports = {
    tools: Object.assign(baseTools.funcs, tools),
    schemas: baseTools.schemas.concat(schemas)
}
export default module.exports;