import React from 'react'

import { FieldErrors, FieldValues, UseFormRegister } from 'react-hook-form'
import FormGenerator from '../form-generator'

type DomainUpdateProps = {
  name: string
  register: UseFormRegister<FieldValues>
  errors: FieldErrors<FieldValues>
  control: any
}

export const DomainUpdate = ({
  name,
  register,
  errors,
  control,
}: DomainUpdateProps) => {
  return (
    <div className="flex gap-2 pt-5 items-end w-[400px]">
      <FormGenerator
        label="Domain name"
        register={register}
        name="domain"
        errors={errors}
        type="text"
        inputType="input"
        placeholder={name}
        control={control}
      />
    </div>
  )
}
