export declare function migrateDshPetDisplayConfig(
  home: string,
  note?: (message: string) => void
): Promise<boolean>

export declare function migrateInstalledPluginConfig(
  home: string,
  pluginName: string,
  note?: (message: string) => void
): Promise<boolean>
