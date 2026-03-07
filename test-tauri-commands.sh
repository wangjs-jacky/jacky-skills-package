#!/bin/bash

# Tauri 命令测试脚本
# 用于验证 Task 18: 测试 Tauri 应用启动

echo "=== Task 18: 测试 Tauri 应用启动 ==="
echo ""

# 1. 检查应用进程
echo "1. 检查应用进程..."
if ps aux | grep -v grep | grep "target/debug/j-skills" > /dev/null; then
    echo "✅ Tauri 应用进程正在运行"
else
    echo "❌ Tauri 应用进程未找到"
    exit 1
fi

# 2. 检查 Vite 开发服务器
echo ""
echo "2. 检查 Vite 开发服务器..."
if lsof -i :5173 > /dev/null 2>&1; then
    echo "✅ Vite 开发服务器运行在 http://localhost:5173"
else
    echo "❌ Vite 开发服务器未运行"
    exit 1
fi

# 3. 检查应用窗口
echo ""
echo "3. 检查应用窗口..."
if osascript -e 'tell application "System Events" to get name of every process whose visible is true' 2>/dev/null | grep -i "j-skills" > /dev/null; then
    echo "✅ j-skills 应用窗口已打开"
else
    echo "⚠️  无法确认应用窗口状态（可能需要手动检查）"
fi

# 4. 测试注册表文件
echo ""
echo "4. 检查注册表文件..."
if [ -f ~/.j-skills/registry.json ]; then
    echo "✅ 注册表文件存在: ~/.j-skills/registry.json"
    echo "   内容预览:"
    cat ~/.j-skills/registry.json | head -10
else
    echo "ℹ️  注册表文件不存在（首次运行时正常）"
fi

# 5. 测试配置文件
echo ""
echo "5. 检查配置文件..."
if [ -f ~/.j-skills/config.json ]; then
    echo "✅ 配置文件存在: ~/.j-skills/config.json"
    echo "   内容:"
    cat ~/.j-skills/config.json
else
    echo "ℹ️  配置文件不存在（将使用默认配置）"
fi

echo ""
echo "=== 测试完成 ==="
echo ""
echo "下一步建议："
echo "1. 在应用窗口中手动测试界面"
echo "2. 使用浏览器开发工具检查 API 调用"
echo "3. 尝试链接一个测试 skill"
echo ""
echo "测试 skill 创建命令："
echo "mkdir -p /tmp/test-skill"
echo 'cat > /tmp/test-skill/SKILL.md << EOF'
echo '---'
echo 'name: test-skill'
echo 'description: A test skill'
echo '---'
echo ''
echo '# Test Skill'
echo ''
echo 'This is a test skill.'
echo 'EOF'
