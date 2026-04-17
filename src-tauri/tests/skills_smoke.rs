/**
 * Skills Commands Smoke Tests
 * 验证 L5 门控：Rust 命令层单元测试
 */
use std::fs;
use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use tempfile::TempDir;
use j_skills_lib::{Registry, SkillInfo, SkillSource, AppState};

// 测试串行化锁：避免并发修改 J_SKILLS_DIR 环境变量导致竞争
static TEST_MUTEX: std::sync::Mutex<()> = std::sync::Mutex::new(());

fn setup_test_env() -> (TempDir, PathBuf) {
    let temp_dir = TempDir::new().expect("Failed to create temp dir");
    let j_skills_dir = temp_dir.path().join(".j-skills");
    fs::create_dir_all(&j_skills_dir).expect("Failed to create .j-skills dir");
    (temp_dir, j_skills_dir)
}

#[test]
fn test_registry_load_empty() {
    let _lock = TEST_MUTEX.lock().unwrap();
    let (_temp_dir, j_skills_dir) = setup_test_env();

    // 设置环境变量指向测试目录
    std::env::set_var("J_SKILLS_DIR", j_skills_dir.to_str().unwrap());

    let registry = Registry::load().expect("Failed to load registry");
    assert!(registry.list_skills().is_empty());

    std::env::remove_var("J_SKILLS_DIR");
}

#[test]
fn test_registry_register_skill() {
    let _lock = TEST_MUTEX.lock().unwrap();
    let (_temp_dir, j_skills_dir) = setup_test_env();
    std::env::set_var("J_SKILLS_DIR", j_skills_dir.to_str().unwrap());

    let mut registry = Registry::load().expect("Failed to load registry");

    let skill = SkillInfo {
        name: "test-skill".to_string(),
        path: "/tmp/test-skill".to_string(),
        source: SkillSource::Linked,
        installed_environments: None,
        installed_at: None,
        description: None,
    };

    registry.register(skill.clone()).expect("Failed to register skill");

    let loaded = registry.get_skill("test-skill").expect("Skill not found");
    assert_eq!(loaded.name, "test-skill");
    assert_eq!(loaded.source, SkillSource::Linked);

    std::env::remove_var("J_SKILLS_DIR");
}

#[test]
fn test_registry_unregister_skill() {
    let _lock = TEST_MUTEX.lock().unwrap();
    let (_temp_dir, j_skills_dir) = setup_test_env();
    std::env::set_var("J_SKILLS_DIR", j_skills_dir.to_str().unwrap());

    let mut registry = Registry::load().expect("Failed to load registry");

    let skill = SkillInfo {
        name: "test-skill".to_string(),
        path: "/tmp/test-skill".to_string(),
        source: SkillSource::Linked,
        installed_environments: None,
        installed_at: None,
        description: None,
    };

    registry.register(skill).expect("Failed to register skill");
    assert!(registry.get_skill("test-skill").is_some());

    registry.unregister("test-skill").expect("Failed to unregister skill");
    assert!(registry.get_skill("test-skill").is_none());

    std::env::remove_var("J_SKILLS_DIR");
}

#[test]
fn test_list_skills_command() {
    let _lock = TEST_MUTEX.lock().unwrap();
    let (_temp_dir, j_skills_dir) = setup_test_env();
    std::env::set_var("J_SKILLS_DIR", j_skills_dir.to_str().unwrap());

    let registry = Registry::load().expect("Failed to load registry");
    let state = AppState {
        registry: Arc::new(Mutex::new(registry)),
    };

    // 模拟 Tauri State（State<'_, T> 与 &T 内存布局相同）
    let tauri_state: tauri::State<'_, AppState> = unsafe { std::mem::transmute(&state) };
    let result = j_skills_lib::commands::list_skills(tauri_state);
    let skills_result = tokio_test::block_on(result).expect("Command failed");

    assert!(skills_result.skills.is_empty());

    std::env::remove_var("J_SKILLS_DIR");
}

#[test]
fn test_link_skill_command() {
    let _lock = TEST_MUTEX.lock().unwrap();
    let (_temp_dir, j_skills_dir) = setup_test_env();
    std::env::set_var("J_SKILLS_DIR", j_skills_dir.to_str().unwrap());

    // 创建测试 skill 目录
    let skill_dir = j_skills_dir.parent().unwrap().join("test-skill");
    fs::create_dir_all(&skill_dir).expect("Failed to create skill dir");
    fs::write(skill_dir.join("SKILL.md"), "# Test Skill").expect("Failed to write SKILL.md");

    let registry = Registry::load().expect("Failed to load registry");
    let state = AppState {
        registry: Arc::new(Mutex::new(registry)),
    };

    // 模拟 Tauri State（State<'_, T> 与 &T 内存布局相同）
    let tauri_state: tauri::State<'_, AppState> = unsafe { std::mem::transmute(&state) };
    let result = j_skills_lib::commands::link_skill(
        skill_dir.to_str().unwrap().to_string(),
        tauri_state,
    );
    let linked = tokio_test::block_on(result).expect("Link command failed");

    assert_eq!(linked, vec!["test-skill"]);

    std::env::remove_var("J_SKILLS_DIR");
}
