"use client"

import * as React from "react"
import Link from "next/link"
import { useQuery, useMutation } from "@tanstack/react-query"
import {
  Pencil,
  Trash2,
  Loader2,
  Search,
  ShieldCheck,
  User as UserIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { TablePagination } from "@/components/ui/table-pagination"
import { getUsers, deleteUser, type User } from "@/apis/users-api"
import { queryKeys, staleTimes, cacheInvalidations } from "@/lib/cache/query-client"
import { useLanguage } from "@/contexts/language-context"

type Employee = User

export default function EmployeeListPage() {
  const { t } = useLanguage()

  const [searchQuery, setSearchQuery] = React.useState("")
  const [roleFilter, setRoleFilter] = React.useState("all")
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false)
  const [selectedEmployee, setSelectedEmployee] = React.useState<Employee | null>(null)

  // Pagination state
  const [currentPage, setCurrentPage] = React.useState(1)
  const [rowsPerPage, setRowsPerPage] = React.useState(10)

  // Fetch all users at once (API limit max is 100)
  const usersQuery = useQuery({
    queryKey: queryKeys.users.lists(),
    queryFn: () => getUsers({ limit: 100 }),
    staleTime: staleTimes.campaigns,
  })

  const totalUsers = usersQuery.data?.total || 0

  // Delete user mutation
  const deleteMutation = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => {
      // Invalidate users list cache
      if (cacheInvalidations.users) {
        cacheInvalidations.users();
      }
    },
  })

  const employees = usersQuery.data?.users || []
  const isLoading = usersQuery.isLoading || deleteMutation.isPending
  const isError = usersQuery.isError

  // Client-side filtering (search and role filter)
  const filteredEmployees = React.useMemo(() => {
    let filtered = employees.filter(
      (employee) =>
        employee.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        employee.email.toLowerCase().includes(searchQuery.toLowerCase())
    )

    if (roleFilter !== "all") {
      filtered = filtered.filter((employee) => employee.role === roleFilter)
    }

    return filtered
  }, [employees, searchQuery, roleFilter])

  // Client-side pagination for display
  const displayEmployees = React.useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage
    return filteredEmployees.slice(startIndex, startIndex + rowsPerPage)
  }, [filteredEmployees, currentPage, rowsPerPage])

  const totalPages = Math.ceil(filteredEmployees.length / rowsPerPage)

  const handleRowsPerPageChange = (rows: number) => {
    setRowsPerPage(rows)
    setCurrentPage(1)
  }

  const handleDeleteClick = (employee: Employee) => {
    setSelectedEmployee(employee)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!selectedEmployee) return
    await deleteMutation.mutateAsync({ userId: selectedEmployee.id })
    setDeleteDialogOpen(false)
    setSelectedEmployee(null)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const day = String(date.getDate()).padStart(2, "0")
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const year = String(date.getFullYear()).slice(-2)
    return `${day}/${month}/${year}`
  }

  return (
    <div className="flex flex-col gap-6 p-6">


      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center gap-2 py-12">
          <Loader2 className="size-5 animate-spin text-primary" />
          <span className="text-muted-foreground">{t("accounts.loadingEmployees")}</span>
        </div>
      )}

      {/* Error State */}
      {isError && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-6">
          <p className="text-sm text-destructive">
            {t("accounts.loadError")}
          </p>
        </div>
      )}

      {/* Employee Table */}
      {!isLoading && !isError && (
      <Card>
        <CardHeader>
          <CardTitle>{t("accounts.allEmployees")}</CardTitle>
          <CardDescription>
            {t("accounts.allEmployeesDesc")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Search and Filter Toolbar */}
          <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={t("accounts.searchPlaceholder")}
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setCurrentPage(1)
                }}
                className="pl-9"
              />
            </div>
            <Select value={roleFilter} onValueChange={(value) => {
              setRoleFilter(value)
              setCurrentPage(1)
            }}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder={t("accounts.role")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("accounts.allRoles")}</SelectItem>
                <SelectItem value="admin">{t("accounts.admin")}</SelectItem>
                <SelectItem value="employee">{t("accounts.employee")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("accounts.username")}</TableHead>
                  <TableHead>{t("accounts.role")}</TableHead>
                  <TableHead className="text-center">{t("accounts.campaignsCreated")}</TableHead>
                  <TableHead className="text-center">{t("accounts.qrCodesCreated")}</TableHead>
                  <TableHead>{t("accounts.createdAt")}</TableHead>
                  <TableHead className="text-right">{t("common.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayEmployees.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      {t("accounts.noEmployees")}
                    </TableCell>
                  </TableRow>
                ) : (
                  displayEmployees.map((employee) => (
                    <TableRow key={employee.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <Link
                            href={`/dashboard/accounts/${employee.id}`}
                            className="font-medium hover:underline cursor-pointer"
                          >
                            {employee.username}
                          </Link>
                          <span className="text-sm text-muted-foreground">
                            {employee.email}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={employee.role === "admin" ? "default" : "secondary"}
                          className="gap-1"
                        >
                          {employee.role === "admin" ? (
                            <ShieldCheck className="h-3 w-3" />
                          ) : (
                            <UserIcon className="h-3 w-3" />
                          )}
                          {employee.role === "admin" ? t("accounts.admin") : t("accounts.employee")}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center font-medium">
                        {employee.campaignsCreated}
                      </TableCell>
                      <TableCell className="text-center font-medium">
                        {employee.qrCodesCreated}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(employee.createdAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            asChild
                          >
                            <Link href={`/dashboard/accounts/${employee.id}`}>
                              <Pencil className="h-4 w-4" />
                              {t("common.edit")}
                            </Link>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                            onClick={() => handleDeleteClick(employee)}
                          >
                            <Trash2 className="h-4 w-4" />
                            {t("common.delete")}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination Footer */}
          <TablePagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredEmployees.length}
            rowsPerPage={rowsPerPage}
            onPageChange={setCurrentPage}
            onRowsPerPageChange={handleRowsPerPageChange}
            className="mt-4"
          />
        </CardContent>
      </Card>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("accounts.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("accounts.deleteConfirm")}{" "}
              <span className="font-semibold">{selectedEmployee?.username}</span>? {t("accounts.deleteWarning")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("accounts.deleteEmployee")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
