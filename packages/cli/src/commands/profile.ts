/**
 * profile 命令 - 管理 Profile 配置
 */
import { cac } from 'cac'
import * as p from '@clack/prompts'
import { isCancel } from '@clack/prompts'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { resolve, basename } from 'path'
import {
  listProfiles,
  getProfile,
  saveProfile,
  deleteProfile,
  getActiveProfile,
  setActiveProfile,
  duplicateProfile,
  profileExists,
  initializeDefaultProfiles,
} from '../lib/profiles.js'
import { ensureGlobalDir, getProjectProfilePath } from '../lib/paths.js'
import { success, error, info, warn } from '../lib/log.js'
import { findSkill } from './install.js'
import type { Profile, WorkflowType } from '../lib/types.js'

/**
 * Workflow 选项
 */
const WORKFLOW_OPTIONS = [
  { value: 'superpowers', label: 'Superpowers', hint: '强大的 AI 辅助工作流' },
  { value: 'openspec', label: 'OpenSpec', hint: '开放规范工作流' },
  { value: 'spiderkit', label: 'SpiderKit', hint: '爬虫工具集工作流' },
  { value: 'native', label: 'Native', hint: '原生工作流' },
]

/**
 * 注册 profile 命令（使用扁平命令结构）
 */
export function registerProfileCommand(cli: ReturnType<typeof cac>): void {
  // profile:list / profile:ls
  cli
    .command('profile:list', 'List all profiles')
    .alias('profile:ls')
    .option('--json', 'Output as JSON')
    .action((options?: { json?: boolean }) => {
      handleProfileList(options?.json)
    })

  // profile:show
  cli
    .command('profile:show [name]', 'Show profile details')
    .action((name?: string) => {
      handleProfileShow(name)
    })

  // profile:use
  cli
    .command('profile:use [name]', 'Switch to a profile')
    .option('-p, --project', 'Set as project-level profile')
    .action(async (name?: string, options?: { project?: boolean }) => {
      await handleProfileUse(name, options?.project)
    })

  // profile:current
  cli
    .command('profile:current', 'Show current active profile')
    .option('--json', 'Output as JSON')
    .action((options?: { json?: boolean }) => {
      handleProfileCurrent(options?.json)
    })

  // profile:create
  cli
    .command('profile:create [name]', 'Create a new profile interactively')
    .action(async (name?: string) => {
      await handleProfileCreate(name)
    })

  // profile:delete / profile:rm
  cli
    .command('profile:delete [name]', 'Delete a profile')
    .alias('profile:rm')
    .action(async (name?: string) => {
      await handleProfileDelete(name)
    })

  // profile:duplicate / profile:cp
  cli
    .command('profile:duplicate <from> <to>', 'Duplicate a profile')
    .alias('profile:cp')
    .action((from: string, to: string) => {
      handleProfileDuplicate(from, to)
    })

  // profile:export
  cli
    .command('profile:export [name]', 'Export profile to JSON file')
    .option('-o, --output <file>', 'Output file path')
    .action((name?: string, options?: { output?: string }) => {
      handleProfileExport(name, options?.output)
    })

  // profile:import
  cli
    .command('profile:import <file>', 'Import profile from JSON file')
    .action(async (file: string) => {
      await handleProfileImport(file)
    })

  // profile:add-skill
  cli
    .command('profile:add-skill <profile> <skill>', 'Add a skill to a profile')
    .action(async (profileName: string, skillName: string) => {
      await handleProfileAddSkill(profileName, skillName)
    })

  // profile:remove-skill
  cli
    .command('profile:remove-skill <profile> <skill>', 'Remove a skill from a profile')
    .action(async (profileName: string, skillName: string) => {
      await handleProfileRemoveSkill(profileName, skillName)
    })

  // profile:list-skills
  cli
    .command('profile:list-skills [profile]', 'List skills in a profile')
    .option('--json', 'Output as JSON')
    .action((profileName?: string, options?: { json?: boolean }) => {
      handleProfileListSkills(profileName, options?.json)
    })
}

/**
 * 处理 profile list 命令
 */
function handleProfileList(jsonOutput?: boolean): void {
  ensureGlobalDir()
  initializeDefaultProfiles()

  const profiles = listProfiles()
  const activeInfo = getActiveProfile()
  const activeName = activeInfo?.profile.name

  if (jsonOutput) {
    const result = profiles.map((profile) => ({
      name: profile.name,
      description: profile.description,
      workflow: profile.workflow,
      skillsCount: profile.skills.include.length,
      active: profile.name === activeName,
      scope: profile.name === activeName ? activeInfo?.scope ?? null : null,
    }))
    console.log(JSON.stringify(result, null, 2))
    return
  }

  if (profiles.length === 0) {
    info('No profiles found.')
    return
  }

  p.intro(`Profiles (${profiles.length})`)

  for (const profile of profiles) {
    const isActive = profile.name === activeName
    const activeMarker = isActive ? ' \x1b[32m*\x1b[0m' : ''
    const scopeText = isActive && activeInfo ? ` (${activeInfo.scope})` : ''

    console.log('')
    console.log(`  \x1b[36m${profile.name}\x1b[0m${activeMarker}${scopeText}`)

    if (profile.description) {
      console.log(`    ${profile.description}`)
    }

    console.log(`    Workflow: ${profile.workflow}`)
    console.log(`    Skills: ${profile.skills.include.length}`)
  }

  console.log('')
}

/**
 * 处理 profile show 命令
 */
function handleProfileShow(name?: string): void {
  ensureGlobalDir()

  let profileName = name

  if (!profileName) {
    const activeInfo = getActiveProfile()
    if (activeInfo) {
      profileName = activeInfo.profile.name
    } else {
      error('No active profile found.')
      return
    }
  }

  const profile = getProfile(profileName)
  if (!profile) {
    error(`Profile "${profileName}" not found.`)
    return
  }

  const activeInfo = getActiveProfile()
  const isActive = activeInfo?.profile.name === profileName

  p.intro(`Profile: ${profileName}`)

  console.log('')
  console.log(`  Name: ${profile.name}`)
  if (profile.description) {
    console.log(`  Description: ${profile.description}`)
  }
  console.log(`  Version: ${profile.version}`)
  console.log(`  Workflow: ${profile.workflow}`)
  console.log(`  Active: ${isActive ? 'Yes' : 'No'}`)

  if (isActive && activeInfo) {
    console.log(`  Scope: ${activeInfo.scope}`)
  }

  if (profile.skills.include.length > 0) {
    console.log('')
    console.log('  Skills:')
    for (const skill of profile.skills.include) {
      console.log(`    - ${skill}`)
    }
  }

  if (profile.skills.exclude && profile.skills.exclude.length > 0) {
    console.log('')
    console.log('  Excluded Skills:')
    for (const skill of profile.skills.exclude) {
      console.log(`    - ${skill}`)
    }
  }

  if (profile.plugins && profile.plugins.length > 0) {
    console.log('')
    console.log('  Plugins:')
    for (const plugin of profile.plugins) {
      const status = plugin.enabled ? '\x1b[32menabled\x1b[0m' : '\x1b[31mdisabled\x1b[0m'
      console.log(`    - ${plugin.name}${plugin.version ? `@${plugin.version}` : ''} (${status})`)
    }
  }

  if (profile.metadata) {
    console.log('')
    console.log('  Metadata:')
    if (profile.metadata.author) {
      console.log(`    Author: ${profile.metadata.author}`)
    }
    if (profile.metadata.tags && profile.metadata.tags.length > 0) {
      console.log(`    Tags: ${profile.metadata.tags.join(', ')}`)
    }
    if (profile.metadata.createdAt) {
      console.log(`    Created: ${profile.metadata.createdAt}`)
    }
    if (profile.metadata.updatedAt) {
      console.log(`    Updated: ${profile.metadata.updatedAt}`)
    }
  }

  console.log('')
}

/**
 * 处理 profile use 命令
 */
async function handleProfileUse(name?: string, isProject?: boolean): Promise<void> {
  ensureGlobalDir()
  initializeDefaultProfiles()

  let profileName = name

  if (!profileName) {
    const profiles = listProfiles()
    if (profiles.length === 0) {
      error('No profiles available.')
      return
    }

    const activeInfo = getActiveProfile()
    const activeName = activeInfo?.profile.name

    p.intro('Select a profile to activate')

    const selected = await p.select({
      message: 'Choose a profile',
      options: profiles.map((p) => ({
        value: p.name,
        label: p.name,
        hint: p.description || p.workflow,
      })),
      initialValue: activeName,
    })

    if (isCancel(selected)) {
      p.cancel('Operation cancelled.')
      return
    }

    profileName = selected as string
  }

  if (!profileExists(profileName)) {
    error(`Profile "${profileName}" not found.`)
    return
  }

  const projectDir = process.cwd()
  const scope = isProject ? 'project' : 'global'

  const s = p.spinner()
  s.start(`Activating profile "${profileName}"...`)

  const result = setActiveProfile(profileName, scope, projectDir)

  if (result) {
    s.stop('Profile activated!')
    const scopeText = isProject ? 'project-level' : 'global'
    success(`Switched to profile "${profileName}" (${scopeText})`)

    if (isProject) {
      info(`Project profile saved to: ${getProjectProfilePath(projectDir)}`)
    }
  } else {
    s.stop('Failed to activate profile.')
    error(`Failed to activate profile "${profileName}".`)
  }
}

/**
 * 处理 profile current 命令
 */
function handleProfileCurrent(jsonOutput?: boolean): void {
  ensureGlobalDir()

  const activeInfo = getActiveProfile()

  if (!activeInfo) {
    if (jsonOutput) {
      console.log(JSON.stringify({ active: false, profile: null }, null, 2))
    } else {
      info('No active profile.')
    }
    return
  }

  const { profile, scope } = activeInfo

  if (jsonOutput) {
    console.log(
      JSON.stringify(
        {
          active: true,
          profile: {
            name: profile.name,
            description: profile.description,
            workflow: profile.workflow,
            skillsCount: profile.skills.include.length,
          },
          scope,
        },
        null,
        2
      )
    )
    return
  }

  p.intro('Current Active Profile')
  console.log('')
  console.log(`  \x1b[36m${profile.name}\x1b[0m (${scope})`)

  if (profile.description) {
    console.log(`  ${profile.description}`)
  }

  console.log(`  Workflow: ${profile.workflow}`)
  console.log(`  Skills: ${profile.skills.include.length}`)
  console.log('')
}

/**
 * 处理 profile create 命令
 */
async function handleProfileCreate(name?: string): Promise<void> {
  ensureGlobalDir()
  initializeDefaultProfiles()

  p.intro('Create a new profile')

  // 输入名称
  let profileName = name
  if (!profileName) {
    const nameInput = await p.text({
      message: 'Profile name',
      placeholder: 'my-profile',
      validate: (value) => {
        if (!value.trim()) {
          return 'Profile name is required'
        }
        if (!/^[a-z0-9-_]+$/i.test(value)) {
          return 'Profile name can only contain letters, numbers, hyphens, and underscores'
        }
        return undefined
      },
    })

    if (isCancel(nameInput)) {
      p.cancel('Operation cancelled.')
      return
    }

    profileName = nameInput as string
  }

  // 检查是否已存在
  if (profileExists(profileName)) {
    error(`Profile "${profileName}" already exists.`)
    return
  }

  // 输入描述
  const description = await p.text({
    message: 'Description (optional)',
    placeholder: 'My custom profile',
  })

  if (isCancel(description)) {
    p.cancel('Operation cancelled.')
    return
  }

  // 选择 workflow
  const workflow = await p.select({
    message: 'Select workflow',
    options: WORKFLOW_OPTIONS,
    initialValue: 'superpowers',
  })

  if (isCancel(workflow)) {
    p.cancel('Operation cancelled.')
    return
  }

  // 创建 Profile
  const newProfile: Profile = {
    name: profileName,
    description: (description as string) || undefined,
    version: '1.0.0',
    workflow: workflow as WorkflowType,
    skills: {
      include: [],
    },
    metadata: {
      createdAt: new Date().toISOString(),
    },
  }

  const s = p.spinner()
  s.start('Creating profile...')

  saveProfile(newProfile)

  s.stop('Profile created!')
  success(`Profile "${profileName}" created successfully.`)
  info(`Edit it with: j-skills profile:edit ${profileName}`)
}

/**
 * 处理 profile delete 命令
 */
async function handleProfileDelete(name?: string): Promise<void> {
  ensureGlobalDir()

  let profileName = name

  if (!profileName) {
    const profiles = listProfiles().filter((p) => p.name !== 'default')

    if (profiles.length === 0) {
      info('No profiles available to delete (default profile cannot be deleted).')
      return
    }

    p.intro('Select a profile to delete')

    const selected = await p.select({
      message: 'Choose a profile',
      options: profiles.map((p) => ({
        value: p.name,
        label: p.name,
        hint: p.description || p.workflow,
      })),
    })

    if (isCancel(selected)) {
      p.cancel('Operation cancelled.')
      return
    }

    profileName = selected as string
  }

  // 不允许删除 default
  if (profileName === 'default') {
    error('Cannot delete the default profile.')
    return
  }

  // 检查是否存在
  if (!profileExists(profileName)) {
    error(`Profile "${profileName}" not found.`)
    return
  }

  // 确认删除
  const confirm = await p.confirm({
    message: `Are you sure you want to delete profile "${profileName}"?`,
    initialValue: false,
  })

  if (isCancel(confirm) || !confirm) {
    p.cancel('Operation cancelled.')
    return
  }

  const s = p.spinner()
  s.start('Deleting profile...')

  const result = deleteProfile(profileName)

  if (result) {
    s.stop('Profile deleted!')
    success(`Profile "${profileName}" deleted successfully.`)
  } else {
    s.stop('Failed to delete profile.')
    error(`Failed to delete profile "${profileName}".`)
  }
}

/**
 * 处理 profile duplicate 命令
 */
function handleProfileDuplicate(from: string, to: string): void {
  ensureGlobalDir()

  // 检查源 Profile 是否存在
  if (!profileExists(from)) {
    error(`Source profile "${from}" not found.`)
    return
  }

  // 检查目标是否已存在
  if (profileExists(to)) {
    error(`Target profile "${to}" already exists.`)
    return
  }

  const s = p.spinner()
  s.start(`Duplicating profile "${from}" to "${to}"...`)

  const newProfile = duplicateProfile(from, to)

  if (newProfile) {
    s.stop('Profile duplicated!')
    success(`Profile "${from}" duplicated to "${to}".`)
  } else {
    s.stop('Failed to duplicate profile.')
    error(`Failed to duplicate profile "${from}".`)
  }
}

/**
 * 处理 profile export 命令
 */
function handleProfileExport(name?: string, outputFile?: string): void {
  ensureGlobalDir()

  let profileName = name

  if (!profileName) {
    const activeInfo = getActiveProfile()
    if (activeInfo) {
      profileName = activeInfo.profile.name
    } else {
      error('No active profile found. Please specify a profile name.')
      return
    }
  }

  const profile = getProfile(profileName)
  if (!profile) {
    error(`Profile "${profileName}" not found.`)
    return
  }

  const outputPath = outputFile || `${profileName}.json`

  try {
    writeFileSync(outputPath, JSON.stringify(profile, null, 2), 'utf-8')
    success(`Profile "${profileName}" exported to ${outputPath}`)
  } catch (err) {
    error(`Failed to export profile: ${(err as Error).message}`)
  }
}

/**
 * 处理 profile import 命令
 */
async function handleProfileImport(file: string): Promise<void> {
  ensureGlobalDir()

  const filePath = resolve(file)

  if (!existsSync(filePath)) {
    error(`File not found: ${filePath}`)
    return
  }

  let profile: Profile

  try {
    const content = readFileSync(filePath, 'utf-8')
    profile = JSON.parse(content) as Profile
  } catch (err) {
    error(`Failed to parse profile file: ${(err as Error).message}`)
    return
  }

  // 验证必要字段
  if (!profile.name) {
    error('Invalid profile: missing "name" field.')
    return
  }

  if (!profile.workflow) {
    error('Invalid profile: missing "workflow" field.')
    return
  }

  // 检查是否已存在
  if (profileExists(profile.name)) {
    const confirm = await p.confirm({
      message: `Profile "${profile.name}" already exists. Overwrite?`,
      initialValue: false,
    })

    if (isCancel(confirm) || !confirm) {
      p.cancel('Operation cancelled.')
      return
    }
  }

  const s = p.spinner()
  s.start(`Importing profile "${profile.name}"...`)

  // 更新 metadata
  if (!profile.metadata) {
    profile.metadata = {}
  }
  profile.metadata.updatedAt = new Date().toISOString()

  saveProfile(profile)

  s.stop('Profile imported!')
  success(`Profile "${profile.name}" imported successfully.`)
}

/**
 * 处理 profile:add-skill 命令
 */
async function handleProfileAddSkill(profileName: string, skillName: string): Promise<void> {
  ensureGlobalDir()

  const profile = getProfile(profileName)
  if (!profile) {
    error(`Profile "${profileName}" not found.`)
    return
  }

  // 验证 skill 是否存在
  const found = findSkill(skillName)
  if (!found) {
    warn(`Skill "${skillName}" is not linked or installed globally.`)
    const confirm = await p.confirm({
      message: `Add "${skillName}" to profile anyway?`,
      initialValue: false,
    })
    if (isCancel(confirm) || !confirm) {
      p.cancel('Operation cancelled.')
      return
    }
  } else if (found.health === 'broken') {
    warn(`Skill "${skillName}" has a broken symlink.`)
  }

  // 避免重复添加
  if (profile.skills.include.includes(skillName)) {
    info(`Skill "${skillName}" is already in profile "${profileName}".`)
    return
  }

  profile.skills.include.push(skillName)

  // 如果存在 exclude 列表，移除该 skill
  if (profile.skills.exclude) {
    profile.skills.exclude = profile.skills.exclude.filter((s) => s !== skillName)
  }

  const s = p.spinner()
  s.start(`Adding "${skillName}" to profile "${profileName}"...`)

  saveProfile(profile)

  s.stop('Skill added!')
  success(`Skill "${skillName}" added to profile "${profileName}".`)
}

/**
 * 处理 profile:remove-skill 命令
 */
async function handleProfileRemoveSkill(profileName: string, skillName: string): Promise<void> {
  ensureGlobalDir()

  const profile = getProfile(profileName)
  if (!profile) {
    error(`Profile "${profileName}" not found.`)
    return
  }

  if (!profile.skills.include.includes(skillName)) {
    info(`Skill "${skillName}" is not in profile "${profileName}".`)
    return
  }

  const s = p.spinner()
  s.start(`Removing "${skillName}" from profile "${profileName}"...`)

  profile.skills.include = profile.skills.include.filter((s) => s !== skillName)

  // 如果存在 exclude 列表，也移除该 skill
  if (profile.skills.exclude) {
    profile.skills.exclude = profile.skills.exclude.filter((s) => s !== skillName)
  }

  saveProfile(profile)

  s.stop('Skill removed!')
  success(`Skill "${skillName}" removed from profile "${profileName}".`)
}

/**
 * 处理 profile:list-skills 命令
 */
function handleProfileListSkills(profileName?: string, jsonOutput?: boolean): void {
  ensureGlobalDir()

  let name = profileName
  if (!name) {
    const activeInfo = getActiveProfile()
    if (activeInfo) {
      name = activeInfo.profile.name
    } else {
      error('No active profile found. Please specify a profile name.')
      return
    }
  }

  const profile = getProfile(name)
  if (!profile) {
    error(`Profile "${name}" not found.`)
    return
  }

  const skills = profile.skills.include

  if (jsonOutput) {
    console.log(
      JSON.stringify(
        {
          profile: profile.name,
          skills,
          count: skills.length,
        },
        null,
        2
      )
    )
    return
  }

  p.intro(`Skills in profile: ${profile.name}`)
  console.log('')

  if (skills.length === 0) {
    info('No skills in this profile.')
    if (profile.name === 'default') {
      info('Default profile with empty include uses all linked skills.')
    }
  } else {
    for (const skill of skills) {
      const found = findSkill(skill)
      const status = found
        ? found.health === 'broken'
          ? '\x1b[31m(broken link)\x1b[0m'
          : '\x1b[32m(available)\x1b[0m'
        : '\x1b[33m(not found)\x1b[0m'
      console.log(`  - ${skill} ${status}`)
    }
  }

  console.log('')
}
