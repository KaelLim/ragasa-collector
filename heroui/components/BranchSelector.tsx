'use client'

import { useState, useEffect, useMemo } from 'react'
import { Autocomplete, AutocompleteItem } from '@heroui/autocomplete'
import { type BankCode } from '@/lib/supabase'

interface BranchSelectorProps {
  bankCodes: BankCode[]
  selectedBankCode: string
  selectedBranchCode: string
  onSelectionChange: (branchCode: string, branchName: string) => void
  label: string
  placeholder: string
  isRequired?: boolean
}

export default function BranchSelector({
  bankCodes,
  selectedBankCode,
  selectedBranchCode,
  onSelectionChange,
  label,
  placeholder,
  isRequired = false
}: BranchSelectorProps) {
  const [inputValue, setInputValue] = useState('')

  // 當選中的分行代碼改變時，更新 input 顯示
  useEffect(() => {
    if (selectedBranchCode && selectedBankCode) {
      const selectedBranch = bankCodes.find(
        bank => bank.code === selectedBankCode && bank.branch_code === selectedBranchCode
      )
      if (selectedBranch && selectedBranch.branch_name) {
        setInputValue(`${selectedBranch.branch_code} - ${selectedBranch.branch_name}`)
      }
    } else {
      setInputValue('')
    }
  }, [selectedBranchCode, selectedBankCode, bankCodes])

  // 過濾分行列表（只顯示選中銀行的分行）
  const filteredBranches = useMemo(() => {
    if (!selectedBankCode) return []

    // 只顯示該銀行的分行（branch_code 不為 null）
    const branches = bankCodes.filter(
      bank => bank.code === selectedBankCode && bank.branch_code !== null
    )

    if (!inputValue || inputValue.includes(' - ')) {
      return branches
    }

    const searchTerm = inputValue.toLowerCase()
    return branches.filter(bank =>
      bank.branch_code?.toLowerCase().includes(searchTerm) ||
      bank.branch_name?.toLowerCase().includes(searchTerm)
    )
  }, [bankCodes, selectedBankCode, inputValue])

  const handleSelectionChange = (key: React.Key | null) => {
    if (key && typeof key === 'string') {
      const [code, branchCode] = key.split('|')
      const selectedBranch = bankCodes.find(
        bank => bank.code === code && bank.branch_code === branchCode
      )
      if (selectedBranch && selectedBranch.branch_code && selectedBranch.branch_name) {
        setInputValue(`${selectedBranch.branch_code} - ${selectedBranch.branch_name}`)
        onSelectionChange(selectedBranch.branch_code, selectedBranch.branch_name)
      }
    }
  }

  return (
    <Autocomplete
      label={label}
      placeholder={selectedBankCode ? placeholder : "請先選擇銀行代碼"}
      isRequired={isRequired}
      variant="bordered"
      className="w-full"
      inputValue={inputValue}
      onInputChange={setInputValue}
      onSelectionChange={handleSelectionChange}
      selectedKey={selectedBranchCode && selectedBankCode ? `${selectedBankCode}|${selectedBranchCode}` : null}
      items={filteredBranches}
      allowsCustomValue={true}
      isDisabled={!selectedBankCode}
      aria-label={label || "選擇分行"}
      listboxProps={{
        emptyContent: selectedBankCode ? "找不到符合的分行" : "請先選擇銀行代碼"
      }}
    >
      {(bank) => (
        <AutocompleteItem
          key={`${bank.code}|${bank.branch_code}`}
          textValue={`${bank.branch_code} - ${bank.branch_name}`}
        >
          <span className="text-small">{bank.branch_code} - {bank.branch_name}</span>
        </AutocompleteItem>
      )}
    </Autocomplete>
  )
}
