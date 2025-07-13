// Plugin system per MCP Server
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

class PluginManager {
  constructor() {
    this.plugins = new Map();
    this.pluginDir = path.join(__dirname, 'plugins');
  }

  async init() {
    try {
      await fs.access(this.pluginDir);
    } catch {
      await fs.mkdir(this.pluginDir, { recursive: true });
    }
  }

  async loadPlugin(pluginName) {
    try {
      const pluginPath = path.join(this.pluginDir, `${pluginName}.js`);
      
      await fs.access(pluginPath);
      
      const pluginModule = await import(`file://${pluginPath}`);
      
      if (!pluginModule.default || typeof pluginModule.default.execute !== 'function') {
        throw new Error('Plugin deve esportare un oggetto con metodo execute');
      }
      
      const plugin = pluginModule.default;
      
      if (!plugin.name || !plugin.version || !plugin.description) {
        throw new Error('Plugin deve avere name, version e description');
      }
      
      this.plugins.set(pluginName, plugin);
      return { success: true, message: `Plugin ${pluginName} caricato` };
    } catch (error) {
      throw new Error(`Errore caricamento plugin ${pluginName}: ${error.message}`);
    }
  }

  async unloadPlugin(pluginName) {
    if (this.plugins.has(pluginName)) {
      this.plugins.delete(pluginName);
      return { success: true, message: `Plugin ${pluginName} scaricato` };
    }
    throw new Error(`Plugin ${pluginName} non trovato`);
  }

  listPlugins() {
    return Array.from(this.plugins.entries()).map(([name, plugin]) => ({
      name,
      version: plugin.version,
      description: plugin.description,
      tools: plugin.tools || []
    }));
  }

  async executePlugin(pluginName, toolName, args) {
    if (!this.plugins.has(pluginName)) {
      throw new Error(`Plugin ${pluginName} non caricato`);
    }

    const plugin = this.plugins.get(pluginName);
    return await plugin.execute(toolName, args);
  }

  getPluginTools(pluginName) {
    if (!this.plugins.has(pluginName)) {
      return [];
    }
    return this.plugins.get(pluginName).tools || [];
  }

  getAllPluginTools() {
    const allTools = [];
    for (const [pluginName, plugin] of this.plugins) {
      if (plugin.tools) {
        for (const tool of plugin.tools) {
          allTools.push({
            ...tool,
            pluginName,
            name: `plugin_${pluginName}_${tool.name}`
          });
        }
      }
    }
    return allTools;
  }

  async createExamplePlugin() {
    const examplePlugin = `// Plugin di esempio per MCP Server
export default {
  name: 'example',
  version: '1.0.0',
  description: 'Plugin di esempio con strumenti base',
  
  tools: [
    {
      name: 'hello',
      description: 'Saluta l\\'utente',
      inputSchema: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Nome da salutare',
            default: 'Mondo'
          }
        }
      }
    }
  ],

  async execute(toolName, args) {
    switch (toolName) {
      case 'hello':
        return {
          content: [{
            type: 'text',
            text: \`Ciao \${args.name || 'Mondo'}!\`
          }]
        };
        
      default:
        throw new Error(\`Tool non trovato: \${toolName}\`);
    }
  }
};
`;

    const examplePath = path.join(this.pluginDir, 'example.js');
    await fs.writeFile(examplePath, examplePlugin);
    return { success: true, path: examplePath };
  }
}

export { PluginManager };