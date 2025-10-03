'use client'

import { useState, useEffect, useMemo } from 'react'
import { Autocomplete, AutocompleteItem } from '@heroui/autocomplete'

interface VillageSelectorProps {
  selectedVillageId: string
  onSelectionChange: (villageId: string, isUsedInRagic: boolean) => void
  label: string
  placeholder: string
  isRequired?: boolean
}

// 大村編號配置
const villageConfig = {
  '大安': { max: 500, color: 'primary' },
  '大華': { max: 700, color: 'secondary' },
  '大同': { max: 300, color: 'success' },
  '其他': { max: 300, color: 'warning' }
}

export default function VillageSelector({
  selectedVillageId,
  onSelectionChange,
  label,
  placeholder,
  isRequired = false
}: VillageSelectorProps) {
  const [inputValue, setInputValue] = useState('')

  // 產生所有可能的大村編號
  const allVillageIds = useMemo(() => {
    const ids: Array<{ id: string, village: string, number: string }> = []

    Object.entries(villageConfig).forEach(([village, config]) => {
      for (let i = 1; i <= config.max; i++) {
        const number = String(i).padStart(3, '0')
        ids.push({
          id: `${village}${number}`,
          village,
          number
        })
      }
    })

    return ids
  }, [])

  // 當選中的大村改變時，更新 input 顯示
  useEffect(() => {
    if (selectedVillageId) {
      setInputValue(selectedVillageId)
    } else {
      setInputValue('')
    }
  }, [selectedVillageId])

  // 過濾大村列表
  const filteredVillages = useMemo(() => {
    if (!inputValue) return allVillageIds.slice(0, 50) // 預設只顯示前50個

    const searchTerm = inputValue.toLowerCase()

    // 如果已經是完整格式（例：大安001），顯示相近的
    if (inputValue.match(/^(大安|大華|大同|其他)\d{0,3}$/)) {
      return allVillageIds.filter(v =>
        v.id.toLowerCase().includes(searchTerm)
      ).slice(0, 20)
    }

    // 一般搜尋
    return allVillageIds.filter(v =>
      v.id.toLowerCase().includes(searchTerm) ||
      v.village.includes(searchTerm) ||
      v.number.includes(searchTerm)
    ).slice(0, 50)
  }, [allVillageIds, inputValue])

  const handleSelectionChange = async (key: React.Key | null) => {
    if (key && typeof key === 'string') {
      setInputValue(key)

      // 檢查 Ragic 是否已使用此編號
      try {
        const response = await fetch(`/api/ragic-check?village=${encodeURIComponent(key)}`)
        const result = await response.json()

        onSelectionChange(key, result.exists || false)

        if (result.exists) {
          console.warn('⚠️ Ragic 已存在此編號:', key)
        }
      } catch (error) {
        console.error('檢查 Ragic 編號失敗:', error)
        onSelectionChange(key, false)
      }
    }
  }

  return (
    <Autocomplete
      label={label}
      placeholder={placeholder}
      isRequired={isRequired}
      variant="bordered"
      className="w-full"
      inputValue={inputValue}
      onInputChange={setInputValue}
      onSelectionChange={handleSelectionChange}
      selectedKey={selectedVillageId || null}
      items={filteredVillages}
      allowsCustomValue={true}
      aria-label={label || "選擇大村"}
      listboxProps={{
        emptyContent: "找不到符合的大村編號"
      }}
    >
      {(item) => (
        <AutocompleteItem
          key={item.id}
          textValue={item.id}
        >
          <div className="flex justify-between items-center">
            <span className="font-medium">{item.id}</span>
            <span className="text-xs text-default-400">{item.village}</span>
          </div>
        </AutocompleteItem>
      )}
    </Autocomplete>
  )
}
