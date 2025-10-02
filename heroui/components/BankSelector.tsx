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

  // 過濾銀行代碼列表（只顯示總行，branch_code 為 null 的項目）
  const uniqueBanks = useMemo(() => {
    // 只保留 branch_code 為 null 的總行資料
    const mainBranches = bankCodes.filter(bank => bank.branch_code === null)

    // 去重：同一個 code 只保留一筆
    const seen = new Set<string>()
    return mainBranches.filter(bank => {
      if (seen.has(bank.code)) {
        return false
      }
      seen.add(bank.code)
      return true
    })
  }, [bankCodes])

  const filteredBanks = useMemo(() => {
    if (!inputValue) return uniqueBanks

    // 如果輸入值是完整的選擇結果（格式：004 - 臺灣銀行），顯示所有銀行
    if (inputValue.includes(' - ')) {
      return uniqueBanks
    }

    const searchTerm = inputValue.toLowerCase()
    return uniqueBanks.filter(bank =>
      bank.code.toLowerCase().includes(searchTerm) ||
      bank.name.toLowerCase().includes(searchTerm)
    )
  }, [uniqueBanks, inputValue])

  // 移除分組邏輯（新的 bank_codes 表沒有 type 欄位）

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