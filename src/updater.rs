use anyhow::Result;
use semver::Version;
use serde::Deserialize;

#[allow(dead_code)]
const GITHUB_REPO: &str = "your-username/fb-reels-lite";
#[allow(dead_code)]
const GITHUB_API_URL: &str = "https://api.github.com/repos";

#[allow(dead_code)]
#[derive(Debug, Deserialize)]
struct GitHubRelease {
    tag_name: String,
    name: String,
    assets: Vec<GitHubAsset>,
}

#[allow(dead_code)]
#[derive(Debug, Deserialize)]
struct GitHubAsset {
    name: String,
    browser_download_url: String,
    size: u64,
}

#[allow(dead_code)]
pub struct Updater {
    current_version: Version,
}

#[allow(dead_code)]
impl Updater {
    pub fn new() -> Self {
        let current_version = Version::parse(env!("CARGO_PKG_VERSION")).unwrap_or_else(|_| {
            Version::new(0, 1, 0)
        });

        Self { current_version }
    }

    pub async fn check_for_update(&self) -> Result<Option<UpdateInfo>> {
        let url = format!("{}/{}/releases/latest", GITHUB_API_URL, GITHUB_REPO);

        let client = reqwest::Client::new();
        let response = client
            .get(&url)
            .header("User-Agent", "FbReelsLite")
            .send()
            .await?;

        if response.status() == reqwest::StatusCode::NOT_FOUND {
            return Ok(None);
        }

        if response.status() == reqwest::StatusCode::FORBIDDEN {
            log::warn!("GitHub API rate limit exceeded");
            return Ok(None);
        }

        let release: GitHubRelease = response.json().await?;

        let latest_version = Version::parse(release.tag_name.trim_start_matches('v'))
            .map_err(|e| anyhow::anyhow!("Invalid version format: {}", e))?;

        if latest_version > self.current_version {
            let asset = release.assets.iter().find(|a| {
                a.name.ends_with(".exe") || a.name.ends_with("-windows.zip")
            });

            if let Some(asset) = asset {
                return Ok(Some(UpdateInfo {
                    version: latest_version,
                    download_url: asset.browser_download_url.clone(),
                    size: asset.size,
                }));
            }
        }

        Ok(None)
    }
}

#[allow(dead_code)]
pub struct UpdateInfo {
    pub version: Version,
    pub download_url: String,
    pub size: u64,
}

impl std::fmt::Display for UpdateInfo {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(
            f,
            "v{} ({} bytes)",
            self.version,
            self.size
        )
    }
}
