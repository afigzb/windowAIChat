/**
 * 默认工作流配置
 * 
 * 工作流：优化输入 → 生成结构 → 主生成
 */

import type { WorkflowConfig } from '../types'

/**
 * 默认工作流：优化并生成
 */
export const DEFAULT_WORKFLOW: WorkflowConfig = {
  name: 'optimize-and-generate',
  description: '优化用户输入，生成文章结构，然后使用主模型生成内容',
  
  tasks: [
    // 任务 1: 判断是否需要优化
    {
      id: 'should-optimize',
      name: '判断是否优化',
      description: '判断用户输入是否需要优化',
      
      input: {
        type: 'user-input'
      },
      
      tool: {
        type: 'judgment',
        name: '输入质量判断',
        systemPrompt: `你是一个专业的文本质量评估助手。判断用户输入是否需要优化。

判断标准：
1. 存在明显的语法错误、错别字 → 需要优化
2. 表达不清晰、逻辑混乱 → 需要优化  
3. 句子过于简短（少于10个字）→ 需要优化
4. 输入已经清晰、准确、完整 → 无需优化

请返回：<是/> 或 <否/>`,
        
        parser: {
          type: 'tag',
          yesTag: '<是/>',
          noTag: '<否/>'
        },
        
        progressMessage: '正在判断输入质量...'
      },
      
      output: {
        type: 'none'  // 判断结果不保存，仅用于条件控制
      }
    },
    
    // 任务 2: 优化输入（条件：如果需要优化）
    {
      id: 'optimize-input',
      name: '输入优化',
      description: '优化用户输入，使其更清晰准确',
      
      input: {
        type: 'user-input'
      },
      
      tool: {
        type: 'transform',
        name: '输入优化器',
        systemPrompt: `你是一个专业的文本优化助手。优化用户输入，使其更清晰、准确、易于理解。

优化原则：
1. 保持原意不变
2. 修正语法错误或错别字
3. 使表达更简洁明了
4. 补充必要的上下文

请直接输出优化后的文本，不要添加任何解释。`,
        
        outputParser: {
          type: 'trim'
        },
        
        progressMessage: '正在优化输入...'
      },
      
      output: {
        type: 'goal'  // 更新目标
      },
      
      condition: {
        type: 'if-true',
        taskId: 'should-optimize'
      }
    },
    
    // 任务 3: 概括文件内容（如果有附加文件）
    {
      id: 'summarize-files',
      name: '概括文件内容',
      description: '将附加的文件内容进行概括总结',
      
      input: {
        type: 'all-files'
      },
      
      tool: {
        type: 'transform',
        name: '文件内容概括器',
        systemPrompt: `你是一个专业的文本概括助手。请对提供的文件内容进行高质量的概括总结。

概括原则：
1. 提取核心信息和关键要点
2. 保留重要细节和数据
3. 删除冗余和重复内容
4. 使用简洁清晰的语言
5. 保持逻辑结构清晰

请直接输出概括后的内容，不要添加"概括："等前缀。`,
        
        outputParser: {
          type: 'trim'
        },
        
        progressMessage: '正在概括文件内容...'
      },
      
      output: {
        type: 'files',
        mode: 'replace'  // 替换整个文件列表
      },
      
      condition: {
        type: 'custom',
        check: (results) => {
          // 只有当有附加文件时才概括
          // 暂时总是执行（实际会在执行时检查文件）
          return true
        }
      }
    },
    
    // 任务 4: 主模型生成
    {
      id: 'main-generation',
      name: '主模型生成',
      description: '使用主模型生成最终内容',
      
      input: {
        type: 'goal'  // 使用处理后的目标作为输入
      },
      
      tool: {
        type: 'generation',
        name: '主模型'
      },
      
      output: {
        type: 'none'  // 主生成结果不写回原始数据
      }
    }
  ]
}

/**
 * 简单工作流：直接生成（不做任何预处理）
 */
export const SIMPLE_WORKFLOW: WorkflowConfig = {
  name: 'simple-generate',
  description: '直接使用主模型生成内容，不做任何预处理',
  
  tasks: [
    {
      id: 'main-generation',
      name: '主模型生成',
      description: '使用主模型生成内容',
      
      input: {
        type: 'user-input'
      },
      
      tool: {
        type: 'generation',
        name: '主模型'
      },
      
      output: {
        type: 'none'
      }
    }
  ]
}

