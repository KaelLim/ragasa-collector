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
      selectedKey={selectedBankCode ? `${selectedBankCode}-${bankCodes.find(b => b.code === selectedBankCode)?.name}` : null}
      items={filteredBanks}
      allowsCustomValue={false}
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