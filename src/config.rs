use anyhow::Result;
use directories::ProjectDirs;
use std::fs;
use std::path::PathBuf;

use crate::app::AppConfig;

pub struct ConfigManager {
    config_path: PathBuf,
    config: AppConfig,
}

impl ConfigManager {
    pub fn new() -> Self {
        let config_path = Self::get_config_path();
        let config = Self::load_from_path(&config_path).unwrap_or_default();

        Self {
            config_path,
            config,
        }
    }

    fn get_config_path() -> PathBuf {
        if let Some(project_dirs) = ProjectDirs::from("com", "fb-reels-lite", "app") {
            let config_dir = project_dirs.config_dir();
            fs::create_dir_all(config_dir).ok();
            config_dir.join("config.json")
        } else {
            PathBuf::from("config.json")
        }
    }

    fn load_from_path(path: &PathBuf) -> Option<AppConfig> {
        let data = fs::read_to_string(path).ok()?;
        serde_json::from_str(&data).ok()
    }

    pub fn load(&mut self) -> Result<()> {
        if let Some(config) = Self::load_from_path(&self.config_path) {
            self.config = config;
        }
        Ok(())
    }

    #[allow(dead_code)]
    pub fn save(&self) -> Result<()> {
        let json = serde_json::to_string_pretty(&self.config)?;
        if let Some(parent) = self.config_path.parent() {
            fs::create_dir_all(parent)?;
        }
        fs::write(&self.config_path, json)?;
        Ok(())
    }

    pub fn get(&self) -> &AppConfig {
        &self.config
    }

    #[allow(dead_code)]
    pub fn get_mut(&mut self) -> &mut AppConfig {
        &mut self.config
    }
}
