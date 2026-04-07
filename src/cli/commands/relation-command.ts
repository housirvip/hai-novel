import { Command } from "commander";
import { loadRuntimeContext } from "../../app/services/context-service.js";
import { RelationService } from "../../app/services/relation-service.js";
import { logger } from "../../utils/logger.js";
import {
  assertInitialized,
  parseOptionalIntegerOption,
  parseRequiredIntegerOption
} from "../command-helpers.js";

export function registerRelationCommands(program: Command): void {
  const relation = program.command("relation").description("Relation management commands.");

  relation
    .command("character:add")
    .description("Add a relation between two characters.")
    .requiredOption("--project <id>", "Project id", (value: string) =>
      parseRequiredIntegerOption(value, "--project")
    )
    .requiredOption("--from <id>", "Source character id", (value: string) =>
      parseRequiredIntegerOption(value, "--from")
    )
    .requiredOption("--to <id>", "Target character id", (value: string) =>
      parseRequiredIntegerOption(value, "--to")
    )
    .requiredOption("--type <type>", "Relation type")
    .option("--summary <summary>", "Relation summary")
    .option("--details <details>", "Relation details")
    .option("--intensity <number>", "Relation intensity", (value: string) =>
      parseOptionalIntegerOption(value, "--intensity")
    )
    .option("--visibility <visibility>", "Relation visibility")
    .action(async (options) => {
      await assertInitialized(process.cwd());
      const context = await loadRuntimeContext(process.cwd());
      const service = new RelationService(context);
      const relationRecord = service.createCharacterRelation({
        projectId: options.project,
        characterId: options.from,
        relatedCharacterId: options.to,
        relationType: options.type,
        summary: options.summary,
        details: options.details,
        intensity: options.intensity,
        visibility: options.visibility
      });

      console.table([
        {
          id: relationRecord.id,
          project_id: relationRecord.project_id,
          from: relationRecord.character_id,
          to: relationRecord.related_character_id,
          type: relationRecord.relation_type,
          status: relationRecord.status
        }
      ]);
    });

  relation
    .command("character:list")
    .description("List character relations.")
    .requiredOption("--project <id>", "Project id", (value: string) =>
      parseRequiredIntegerOption(value, "--project")
    )
    .option("--character <id>", "Character id filter", (value: string) =>
      parseOptionalIntegerOption(value, "--character")
    )
    .action(async (options) => {
      await assertInitialized(process.cwd());
      const context = await loadRuntimeContext(process.cwd());
      const service = new RelationService(context);
      const relations = service.listCharacterRelations(options.project, options.character);

      if (relations.length === 0) {
        logger.info("No character relations found.");
        return;
      }

      console.table(
        relations.map((relationRecord) => ({
          id: relationRecord.id,
          from: relationRecord.character_name,
          to: relationRecord.related_character_name,
          type: relationRecord.relation_type,
          intensity: relationRecord.intensity ?? "",
          status: relationRecord.status
        }))
      );
    });

  relation
    .command("faction:add")
    .description("Add a relation between a character and a faction.")
    .requiredOption("--project <id>", "Project id", (value: string) =>
      parseRequiredIntegerOption(value, "--project")
    )
    .requiredOption("--character <id>", "Character id", (value: string) =>
      parseRequiredIntegerOption(value, "--character")
    )
    .requiredOption("--faction <id>", "Faction id", (value: string) =>
      parseRequiredIntegerOption(value, "--faction")
    )
    .requiredOption("--type <type>", "Relation type")
    .option("--title <title>", "Role title in faction")
    .option("--stance <stance>", "Relation stance")
    .option("--summary <summary>", "Relation summary")
    .option("--details <details>", "Relation details")
    .option("--primary", "Mark as primary relation")
    .action(async (options) => {
      await assertInitialized(process.cwd());
      const context = await loadRuntimeContext(process.cwd());
      const service = new RelationService(context);
      const relationRecord = service.createCharacterFactionRelation({
        projectId: options.project,
        characterId: options.character,
        factionId: options.faction,
        relationType: options.type,
        title: options.title,
        stance: options.stance,
        summary: options.summary,
        details: options.details,
        isPrimary: options.primary === true
      });

      console.table([
        {
          id: relationRecord.id,
          project_id: relationRecord.project_id,
          character_id: relationRecord.character_id,
          faction_id: relationRecord.faction_id,
          type: relationRecord.relation_type,
          primary: relationRecord.is_primary === 1 ? "yes" : "no"
        }
      ]);
    });

  relation
    .command("faction:list")
    .description("List character-faction relations.")
    .requiredOption("--project <id>", "Project id", (value: string) =>
      parseRequiredIntegerOption(value, "--project")
    )
    .option("--character <id>", "Character id filter", (value: string) =>
      parseOptionalIntegerOption(value, "--character")
    )
    .option("--faction <id>", "Faction id filter", (value: string) =>
      parseOptionalIntegerOption(value, "--faction")
    )
    .action(async (options) => {
      await assertInitialized(process.cwd());
      const context = await loadRuntimeContext(process.cwd());
      const service = new RelationService(context);
      const relations = service.listCharacterFactionRelations(options.project, {
        characterId: options.character,
        factionId: options.faction
      });

      if (relations.length === 0) {
        logger.info("No character-faction relations found.");
        return;
      }

      console.table(
        relations.map((relationRecord) => ({
          id: relationRecord.id,
          character: relationRecord.character_name,
          faction: relationRecord.faction_name,
          type: relationRecord.relation_type,
          title: relationRecord.title ?? "",
          primary: relationRecord.is_primary === 1 ? "yes" : "no",
          status: relationRecord.status
        }))
      );
    });
}
