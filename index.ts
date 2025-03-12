import {z} from 'zod';
import {zodToJsonSchema} from 'zod-to-json-schema';
import {Server} from '@modelcontextprotocol/sdk/server/index.js';
import {StdioServerTransport} from '@modelcontextprotocol/sdk/server/stdio.js';
import {CallToolRequestSchema, ErrorCode, ListToolsRequestSchema, McpError} from '@modelcontextprotocol/sdk/types.js';
import fs from 'fs/promises';
import fss from 'fs';
import path from 'path';
import Blueprint from 'factorio-blueprint';
import {DEFAULT_ENTITIES} from './defaultEntityTypes.js';

debugger;
Blueprint.setEntityData(DEFAULT_ENTITIES);
// Initialize blueprint
let blueprint = new Blueprint();

// Ensure the blueprint directory exists
let paths = process.cwd();

paths = 'C:\\Users\\sal\\AppData\\Local\\AnthropicClaude\\app-0.8.0';
const BLUEPRINT_DIR = path.join(paths, 'blueprints');
async function ensureBlueprintDir() {
  try {
    await fs.mkdir(BLUEPRINT_DIR, {recursive: true});
  } catch (error) {
    console.error('Failed to create blueprints directory:', error);
  }
}
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

// Save blueprint to disk
async function saveBlueprintToDisk(): Promise<string | null> {
  try {
    const blueprintString = blueprint.encode();
    const filename = `blueprint.txt`;
    await fs.writeFile(path.join(BLUEPRINT_DIR, filename), blueprintString);
    console.error(`Blueprint saved to ${filename}`);
    return filename;
  } catch (error) {
    console.error('Failed to save blueprint:', error);
    return null;
  }
}

blueprint.load(fss.readFileSync(path.join(BLUEPRINT_DIR, 'blueprint.txt'), 'utf8'));

// Define position type
interface Position {
  x: number;
  y: number;
}

// Define result types
interface SuccessResult {
  success: boolean;
  [key: string]: any;
}

// Initialize server
const server = new Server(
  {
    name: 'factorio-mcp-server',
    version: '0.1.0',
  },
  {
    capabilities: {
      resources: {},
      tools: {},
      logging: {},
    },
  }
);

// Define schemas for tool inputs
const PositionSchema = z.object({
  x: z.number(),
  y: z.number(),
});

const CreateEntitySchema = z.object({
  name: z.string().describe('The name of the entity to create'),
  position: PositionSchema.describe('The position {x, y} to place the entity'),
  direction: z.number().optional().describe('The direction (0, 2, 4, 6) of the entity, where 0 is north'),
  recipe: z.string().optional().describe('Recipe to set (for assembling machines)'),
  modules: z.array(z.string()).optional().describe('Modules to insert into the entity'),
});

const ReadEntitySchema = z.object({
  position: PositionSchema.describe('The position {x, y} to read entity from'),
});

const RemoveEntitySchema = z.object({
  position: PositionSchema.describe('The position {x, y} of the entity to remove'),
});

const MoveEntitySchema = z.object({
  fromPosition: PositionSchema.describe('The current position {x, y} of the entity'),
  toPosition: PositionSchema.describe('The new position {x, y} for the entity'),
});

const CreateTileSchema = z.object({
  name: z.string().describe('The name of the tile to create'),
  position: PositionSchema.describe('The position {x, y} to place the tile'),
});

const RemoveTileSchema = z.object({
  position: PositionSchema.describe('The position {x, y} of the tile to remove'),
});

const BlueprintInfoSchema = z.object({
  includeEntities: z.boolean().optional().describe('Whether to include entity details in the response'),
  includeTiles: z.boolean().optional().describe('Whether to include tile details in the response'),
});

const ResetBlueprintSchema = z.object({
  confirm: z.boolean().describe('Confirm that you want to reset the blueprint'),
});

const EntityInfoSchema = z.object({
  name: z.string().describe('The name of the entity to get information about'),
});

// Tools list
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'create_entity',
      description: 'Create a new entity in the blueprint at the specified position',
      inputSchema: zodToJsonSchema(CreateEntitySchema),
    },
    {
      name: 'create_entities',
      description: 'Create a multiple new entity in the blueprint at the specified positions',
      inputSchema: zodToJsonSchema(
        z.object({
          entities: z.array(CreateEntitySchema),
        })
      ),
    },
    {
      name: 'read_entity',
      description: 'Read entity information at the specified position',
      inputSchema: zodToJsonSchema(ReadEntitySchema),
    },
    {
      name: 'remove_entity',
      description: 'Remove an entity at the specified position',
      inputSchema: zodToJsonSchema(RemoveEntitySchema),
    },
    {
      name: 'move_entity',
      description: 'Move an entity from one position to another',
      inputSchema: zodToJsonSchema(MoveEntitySchema),
    },
    {
      name: 'create_tile',
      description: 'Create a new tile in the blueprint at the specified position',
      inputSchema: zodToJsonSchema(CreateTileSchema),
    },
    {
      name: 'remove_tile',
      description: 'Remove a tile at the specified position',
      inputSchema: zodToJsonSchema(RemoveTileSchema),
    },
    {
      name: 'get_blueprint_info',
      description: 'Get information about the current blueprint',
      inputSchema: zodToJsonSchema(BlueprintInfoSchema),
    },
    {
      name: 'get_blueprint_string',
      description: 'Get the encoded blueprint string',
      inputSchema: zodToJsonSchema(z.object({})),
    },
    {
      name: 'list_entity_types',
      description: 'List available entity types that can be created',
      inputSchema: zodToJsonSchema(z.object({})),
    },
    {
      name: 'get_entity_info',
      description: 'Get information about a specific entity type',
      inputSchema: zodToJsonSchema(EntityInfoSchema),
    },
    {
      name: 'reset_blueprint',
      description: 'Reset the blueprint to an empty state',
      inputSchema: zodToJsonSchema(ResetBlueprintSchema),
    },
  ],
}));

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const toolName = request.params.name;
  const args = request.params.arguments;
  console.error(`Tool called: ${toolName}`, args);

  let result: SuccessResult;
  let saveResult: string | null = null;

  try {
    switch (toolName) {
      case 'create_entity':
        result = createEntity(
          args as {name: string; position: Position; direction?: number; recipe?: string; modules?: string[]}
        );
        saveResult = await saveBlueprintToDisk();
        break;
      case 'create_entities':
        for (const entityArgs of args.entities as {
          name: string;
          position: Position;
          direction?: number;
          recipe?: string;
          modules?: string[];
        }[]) {
          result = createEntity(entityArgs);
        }
        saveResult = await saveBlueprintToDisk();
        break;

      case 'read_entity':
        result = readEntity(args as {position: Position});
        break;

      case 'remove_entity':
        result = removeEntity(args as {position: Position});
        saveResult = await saveBlueprintToDisk();
        break;

      case 'move_entity':
        result = moveEntity(args as {fromPosition: Position; toPosition: Position});
        saveResult = await saveBlueprintToDisk();
        break;

      case 'create_tile':
        result = createTile(args as {name: string; position: Position});
        saveResult = await saveBlueprintToDisk();
        break;

      case 'remove_tile':
        result = removeTile(args as {position: Position});
        saveResult = await saveBlueprintToDisk();
        break;

      case 'get_blueprint_info':
        result = getBlueprintInfo(args as {includeEntities?: boolean; includeTiles?: boolean});
        break;

      case 'get_blueprint_string':
        result = {
          success: true,
          blueprintString: blueprint.encode(),
        };
        break;

      case 'list_entity_types':
        result = {
          success: true,
          entityTypes: Object.keys(DEFAULT_ENTITIES),
        };
        break;

      case 'get_entity_info':
        result = getEntityInfo(args as {name: string});
        break;

      case 'reset_blueprint':
        result = resetBlueprint(args as {confirm: boolean});
        if (result.success) {
          saveResult = await saveBlueprintToDisk();
        }
        break;

      default:
        throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${toolName}`);
    }

    if (saveResult) {
      result = {...result, savedToFile: saveResult};
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error: any) {
    console.error('Error executing tool:', error);

    if (error instanceof McpError) {
      throw error;
    }

    throw new McpError(ErrorCode.InternalError, `Error executing ${toolName}: ${error.message}`);
  }
});

// Tool implementations
function createEntity(args: {
  name: string;
  position: Position;
  direction?: number;
  recipe?: string;
  modules?: string[];
}): SuccessResult {
  const {name, position, direction = 0, recipe, modules} = args;

  try {
    const entity = blueprint.createEntity(name, position, direction);

    // Set recipe if provided and entity supports it
    if (recipe && entity.recipe !== undefined) {
      entity.recipe = recipe;
    }

    // Set modules if provided and entity supports them
    if (modules && modules.length > 0 && entity.modules !== undefined) {
      // Note: In a real implementation, you'd need to check if the entity supports the specific modules
      // and respect the module limit. For simplicity, we're just setting the property here.
      entity.modules = modules;
    }

    return {
      success: true,
      entity: {
        name: entity.name,
        position: entity.position,
        direction: entity.direction,
        entityNumber: entity.entityNumber,
        recipe: entity.recipe,
        modules: entity.modules,
      },
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
    };
  }
}

function readEntity(args: {position: Position}): SuccessResult {
  const {position} = args;

  try {
    const entity = blueprint.findEntity(position);
    if (!entity) {
      return {
        success: false,
        error: `No entity found at position (${position.x}, ${position.y})`,
      };
    }

    return {
      success: true,
      entity: {
        name: entity.name,
        position: entity.position,
        direction: entity.direction,
        entityNumber: entity.entityNumber,
        recipe: entity.recipe,
        modules: entity.modules,
      },
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
    };
  }
}

function removeEntity(args: {position: Position}): SuccessResult {
  const {position} = args;

  try {
    const removed = blueprint.removeEntityAtPosition(position);
    if (!removed) {
      return {
        success: false,
        error: `No entity found at position (${position.x}, ${position.y})`,
      };
    }

    return {
      success: true,
      removed: {
        name: removed.name,
        position: removed.position,
        direction: removed.direction,
      },
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
    };
  }
}

function moveEntity(args: {fromPosition: Position; toPosition: Position}): SuccessResult {
  const {fromPosition, toPosition} = args;

  try {
    // Find the entity at the from position
    const entity = blueprint.findEntity(fromPosition);
    if (!entity) {
      return {
        success: false,
        error: `No entity found at position (${fromPosition.x}, ${fromPosition.y})`,
      };
    }

    const entityData = {
      name: entity.name,
      direction: entity.direction,
      recipe: entity.recipe,
      modules: entity.modules,
    };

    // Remove the entity from its current position
    blueprint.removeEntity(entity);

    // Create a new entity of the same type at the new position
    const newEntity = blueprint.createEntity(entityData.name, toPosition, entityData.direction);

    // Copy recipe and modules if they exist
    if (entityData.recipe) {
      newEntity.recipe = entityData.recipe;
    }

    if (entityData.modules) {
      newEntity.modules = entityData.modules;
    }

    return {
      success: true,
      moved: {
        name: newEntity.name,
        from: fromPosition,
        to: toPosition,
        direction: newEntity.direction,
      },
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
    };
  }
}

function createTile(args: {name: string; position: Position}): SuccessResult {
  const {name, position} = args;

  try {
    const tile = blueprint.createTile(name, position);
    return {
      success: true,
      tile: {
        name: tile.name,
        position: tile.position,
      },
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
    };
  }
}

function removeTile(args: {position: Position}): SuccessResult {
  const {position} = args;

  try {
    const removed = blueprint.removeTileAtPosition(position);
    if (!removed) {
      return {
        success: false,
        error: `No tile found at position (${position.x}, ${position.y})`,
      };
    }

    return {
      success: true,
      removed: {
        name: removed.name,
        position: removed.position,
      },
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
    };
  }
}

function getBlueprintInfo(args: {includeEntities?: boolean; includeTiles?: boolean}): SuccessResult {
  const {includeEntities = false, includeTiles = false} = args || {};

  try {
    const info: any = {
      entityCount: blueprint.entities.length,
      tileCount: blueprint.tiles.length,
    };

    // Get dimensions if there are entities or tiles
    if (blueprint.entities.length > 0 || blueprint.tiles.length > 0) {
      info.dimensions = {
        topLeft: blueprint.topLeft(),
        bottomRight: blueprint.bottomRight(),
      };
    }

    if (includeEntities && blueprint.entities.length > 0) {
      info.entities = blueprint.entities.map((entity) => ({
        name: entity.name,
        position: entity.position,
        direction: entity.direction,
        entityNumber: entity.entityNumber,
        recipe: entity.recipe,
        modules: entity.modules,
      }));
    }

    if (includeTiles && blueprint.tiles.length > 0) {
      info.tiles = blueprint.tiles.map((tile) => ({
        name: tile.name,
        position: tile.position,
      }));
    }

    return {
      success: true,
      info,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
    };
  }
}

function getEntityInfo(args: {name: string}): SuccessResult {
  const {name} = args;

  try {
    const entityData = DEFAULT_ENTITIES[name];
    if (!entityData) {
      return {
        success: false,
        error: `Entity type "${name}" not found`,
      };
    }

    return {
      success: true,
      entity: {
        name,
        ...entityData,
      },
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
    };
  }
}

function resetBlueprint(args: {confirm: boolean}): SuccessResult {
  const {confirm} = args;

  if (!confirm) {
    return {
      success: false,
      error: 'Reset not confirmed. Set confirm to true to reset the blueprint.',
    };
  }

  try {
    // Create a new empty blueprint
    blueprint = new Blueprint({
      entities: [],
      tiles: [],
      icons: [],
      version: 1,
      item: 'blueprint',
    });

    return {
      success: true,
      message: 'Blueprint has been reset',
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
    };
  }
}

server.onerror = (error: any) => {
  console.error('Server error:', error);
};

process.on('SIGINT', async () => {
  await server.close();
  process.exit(0);
});

async function runServer() {
  try {
    await ensureBlueprintDir();

    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error('Factorio MCP Server running on stdio');

    // Save initial empty blueprint
    await saveBlueprintToDisk();
  } catch (error) {
    console.error('Error starting server:', error);
    process.exit(1);
  }
}

runServer().catch((error) => {
  console.error('Fatal error running server:', error);
  process.exit(1);
});
