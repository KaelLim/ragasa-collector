'use client'

import { useState, useEffect, useMemo } from 'react'
import { Autocomplete, AutocompleteItem } from '@heroui/autocomplete'
import { type BankCode } from '@/lib/supabase'

interface BankSelectorProps {
  bankCodes: BankCode[]
  selectedBankCode: string
  onSelectionChange: (code: string, name: string) => void
  label: string
  placeholder: string
  isRequired?: boolean
}

export default function BankSelector({
  bankCodes,
  selectedBankCode,
  onSelectionChange,
  label,
  placeholder,
  isRequired = false
}: BankSelectorProps) {
  const [inputValue, setInputValue] = useState('')

  // 當選中的銀行代碼改變時，更新 input 顯示
  useEffect(() => {
    if (selectedBankCode) {
      const selectedBank = bankCodes.find(bank => bank.code === selectedBankCode)
      if (selectedBank) {
        setInputValue(`${selectedBank.code} - ${selectedBank.name}`)
      }
    } else {
      setInputValue('')
    }
  }, [selectedBankCode, bankCodes])

  // 過濾銀行代碼列表
  const filteredBanks = useMemo(() => {
    if (!inputValue) return bankCodes

    // 如果輸入值是完整的選擇結果（格式：004 - 臺灣銀行），顯示所有銀行
    if (inputValue.includes(' - ')) {
      return bankCodes
    }

    const searchTerm = inputValue.toLowerCase()
    return bankCodes.filter(bank =>
      bank.code.toLowerCase().includes(searchTerm) ||
      bank.name.toLowerCase().includes(searchTerm)
    )
  }, [bankCodes, inputValue])

  // 按類型分組
  const groupedBanks = useMemo(() => {
    const groups: Record<string, BankCode[]> = {
      bank: [],
      postal: [],
      credit_union: [],
      farmers_association: []
    }

    filteredBanks.forEach(bank => {
      groups[bank.type].push(bank)
    })

    return groups
  }, [filteredBanks])

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'bank': return '🏦 銀行'
      case 'postal': return '📮 郵局'
      case 'credit_union': return '🏛️ 信用合作社'
      case 'farmers_association': return '🌾 農會'
      default: return type
    }
  }

  const handleSelectionChange = (key: React.Key | null) => {
    if (key && typeof key === 'string') {
      const selectedBank = bankCodes.find(bank => `${bank.code}-${bank.name}` === key)
      if (selectedBank) {
        // 設定選中的銀行顯示文字
        setInputValue(`${selectedBank.code} - ${selectedBank.name}`)
        onSelectionChange(selectedBank.code, selectedBank.name)
      }
    }
  }

  // 處理手動輸入的銀行代碼
  const handleInputChange = (value: string) => {
    setInputValue(value)

    // 如果輸入的是 3 位數字，視為銀行代碼
    if (/^\d{3}$/.test(value)) {
      const selectedBank = bankCodes.find(bank => bank.code === value)
      if (selectedBank) {
        // 找到對應銀行，自動填入名稱
        onSelectionChange(selectedBank.code, selectedBank.name)
      } else {
        // 沒有找到對應銀行，但仍接受手動輸入的代碼
        onSelectionChange(value, '手動輸入')
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
      onInputChange={handleInputChange}
      onSelectionChange={handleSelectionChange}
      selectedKey={selectedBankCode ? `${selectedBankCode}-${bankCodes.find(b => b.code === selectedBankCode)?.name}` : null}
      items={filteredBanks}
      allowsCustomValue={true}
      aria-label={label || "選擇銀行"}
      listboxProps={{
        emptyContent: "找不到符合的銀行"
      }}
    >
      {(bank) => (
        <AutocompleteItem
          key={`${bank.code}-${bank.name}`}
          textValue={`${bank.code} - ${bank.name}`}
        >
          <span className="text-small">{bank.code} - {bank.name}</span>
        </AutocompleteItem>
      )}
    </Autocomplete>
  )
}