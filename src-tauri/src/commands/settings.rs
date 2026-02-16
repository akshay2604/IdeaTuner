use keyring::Entry;

const SERVICE_NAME: &str = "com.ideatuner.app";
const KEY_NAME: &str = "anthropic_api_key";

fn get_keyring_entry() -> Result<Entry, String> {
    Entry::new(SERVICE_NAME, KEY_NAME).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_api_key() -> Result<Option<String>, String> {
    let entry = get_keyring_entry()?;
    match entry.get_password() {
        Ok(key) => {
            if key.len() > 14 {
                Ok(Some(format!("{}...{}", &key[..10], &key[key.len() - 4..])))
            } else {
                Ok(Some(key))
            }
        }
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
pub fn get_api_key_raw() -> Result<Option<String>, String> {
    let entry = get_keyring_entry()?;
    match entry.get_password() {
        Ok(key) => Ok(Some(key)),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
pub fn set_api_key(key: String) -> Result<(), String> {
    let entry = get_keyring_entry()?;
    entry.set_password(&key).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn remove_api_key() -> Result<(), String> {
    let entry = get_keyring_entry()?;
    match entry.delete_credential() {
        Ok(_) => Ok(()),
        Err(keyring::Error::NoEntry) => Ok(()),
        Err(e) => Err(e.to_string()),
    }
}
