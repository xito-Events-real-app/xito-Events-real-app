import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Eye, 
  EyeOff, 
  Copy, 
  Phone, 
  MessageCircle 
} from "lucide-react";
import { toast } from "sonner";
import { AccountData, getExpiryStatus, formatPrice, getEffectiveExpiryDate } from "@/lib/accounts-api";
import { format, parseISO } from "date-fns";

interface AccountTableProps {
  accounts: AccountData[];
  onSelectAccount: (account: AccountData) => void;
}

export function AccountTable({ accounts, onSelectAccount }: AccountTableProps) {
  const [visiblePasswords, setVisiblePasswords] = useState<Record<number, boolean>>({});

  const togglePassword = (rowNumber: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setVisiblePasswords(prev => ({
      ...prev,
      [rowNumber]: !prev[rowNumber]
    }));
  };

  const copyToClipboard = (text: string, label: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied!`);
  };

  const handleCall = (number: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (number) {
      window.open(`tel:${number}`, '_self');
    }
  };

  const handleWhatsApp = (number: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (number) {
      const cleanNumber = number.replace(/[^0-9+]/g, '');
      window.open(`https://wa.me/${cleanNumber.replace('+', '')}`, '_blank');
    }
  };

  return (
    <div className="rounded-lg border border-slate-700 overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-800/50 hover:bg-slate-800/50 border-slate-700">
            <TableHead className="text-slate-300 font-semibold">Account Type</TableHead>
            <TableHead className="text-slate-300 font-semibold">ID</TableHead>
            <TableHead className="text-slate-300 font-semibold">Password</TableHead>
            <TableHead className="text-slate-300 font-semibold">Vendor</TableHead>
            <TableHead className="text-slate-300 font-semibold">Expiry</TableHead>
            <TableHead className="text-slate-300 font-semibold">Price</TableHead>
            <TableHead className="text-slate-300 font-semibold text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {accounts.map((account) => {
            const expiryStatus = getExpiryStatus(account);
            const expiryDateStr = getEffectiveExpiryDate(account);
            let formattedExpiry = '-';
            if (expiryDateStr) {
              try {
                formattedExpiry = format(parseISO(expiryDateStr), 'MMM dd, yyyy');
              } catch {
                formattedExpiry = expiryDateStr;
              }
            }
            
            return (
              <TableRow 
                key={account.rowNumber}
                className="border-slate-700 hover:bg-slate-800/30 cursor-pointer"
                onClick={() => onSelectAccount(account)}
              >
                <TableCell>
                  <Badge className="bg-gradient-to-r from-pink-500 to-rose-600 text-white border-0">
                    {account.accountType || 'Unknown'}
                  </Badge>
                </TableCell>
                <TableCell className="text-white font-medium">
                  <div className="flex items-center gap-2">
                    <span className="truncate max-w-[200px]">{account.id || 'No ID'}</span>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-7 w-7 text-slate-400 hover:text-white"
                      onClick={(e) => copyToClipboard(account.id, 'ID', e)}
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-300 font-mono">
                      {visiblePasswords[account.rowNumber] ? account.password : '••••••••'}
                    </span>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-7 w-7 text-slate-400 hover:text-white"
                      onClick={(e) => togglePassword(account.rowNumber, e)}
                    >
                      {visiblePasswords[account.rowNumber] ? (
                        <EyeOff className="h-3.5 w-3.5" />
                      ) : (
                        <Eye className="h-3.5 w-3.5" />
                      )}
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-7 w-7 text-slate-400 hover:text-white"
                      onClick={(e) => copyToClipboard(account.password, 'Password', e)}
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </TableCell>
                <TableCell className="text-slate-300">
                  {account.vendor || '-'}
                </TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className={expiryStatus.colorClass}>{formattedExpiry}</span>
                    <Badge 
                      variant="outline" 
                      className={`${expiryStatus.colorClass} border-current text-xs w-fit mt-1`}
                    >
                      {expiryStatus.label}
                    </Badge>
                  </div>
                </TableCell>
                <TableCell className="text-emerald-400 font-medium">
                  {formatPrice(account.price)}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    {account.vendorNumber && (
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-green-400 hover:bg-green-500/20"
                        onClick={(e) => handleCall(account.vendorNumber, e)}
                      >
                        <Phone className="h-4 w-4" />
                      </Button>
                    )}
                    {account.vendorWhatsapp && (
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-green-400 hover:bg-green-500/20"
                        onClick={(e) => handleWhatsApp(account.vendorWhatsapp, e)}
                      >
                        <MessageCircle className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
