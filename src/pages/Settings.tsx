import { useState } from "react";
import { AppLayout, PageHeader } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { setSpreadsheetId, getSpreadsheetId, isSheetsConfigured } from "@/lib/sheets-api";
import { toast } from "@/hooks/use-toast";
import { Settings as SettingsIcon, Link, CheckCircle, AlertCircle } from "lucide-react";

export default function Settings() {
  const [spreadsheetId, setLocalSpreadsheetId] = useState(getSpreadsheetId());
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = () => {
    setIsSaving(true);
    setSpreadsheetId(spreadsheetId);
    setTimeout(() => {
      setIsSaving(false);
      toast({
        title: "Settings saved",
        description: "Your Google Sheets connection has been configured.",
      });
    }, 500);
  };

  const isConfigured = isSheetsConfigured();

  return (
    <AppLayout>
      <PageHeader 
        title="Settings" 
        subtitle="Configure your app"
        showBack
      />
      
      <div className="px-4 py-6 max-w-lg mx-auto space-y-6 animate-fade-in">
        {/* Connection Status */}
        <Card className={isConfigured ? "border-success/50 bg-success/5" : "border-warning/50 bg-warning/5"}>
          <CardContent className="p-4 flex items-center gap-3">
            {isConfigured ? (
              <>
                <CheckCircle className="w-5 h-5 text-success" />
                <span className="text-sm font-medium">Google Sheets Connected</span>
              </>
            ) : (
              <>
                <AlertCircle className="w-5 h-5 text-warning" />
                <span className="text-sm font-medium">Google Sheets Not Connected</span>
              </>
            )}
          </CardContent>
        </Card>

        {/* Google Sheets Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Link className="w-5 h-5" />
              Google Sheets
            </CardTitle>
            <CardDescription>
              Connect to your WTN CLIENT TRACKER spreadsheet
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="spreadsheetId">Spreadsheet ID</Label>
              <Input
                id="spreadsheetId"
                value={spreadsheetId}
                onChange={(e) => setLocalSpreadsheetId(e.target.value)}
                placeholder="Enter your Google Spreadsheet ID"
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Find this in your Google Sheet URL: docs.google.com/spreadsheets/d/<strong>[SPREADSHEET_ID]</strong>/edit
              </p>
            </div>

            <div className="bg-muted/50 rounded-lg p-3 text-sm space-y-2">
              <p className="font-medium">Setup Instructions:</p>
              <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                <li>Open your Google Sheet</li>
                <li>Copy the Spreadsheet ID from the URL</li>
                <li>Share the sheet with your service account email</li>
                <li>Paste the ID above and save</li>
              </ol>
            </div>

            <Button 
              onClick={handleSave} 
              disabled={isSaving || !spreadsheetId.trim()}
              className="w-full gradient-primary text-white"
            >
              {isSaving ? "Saving..." : "Save Connection"}
            </Button>
          </CardContent>
        </Card>

        {/* App Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <SettingsIcon className="w-5 h-5" />
              App Info
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p><strong>Version:</strong> 1.0.0</p>
            <p><strong>PWA Status:</strong> Ready to install</p>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
