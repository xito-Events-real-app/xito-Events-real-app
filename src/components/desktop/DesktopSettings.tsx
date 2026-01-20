import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Settings, 
  UserCog, 
  Link2, 
  CheckCircle, 
  XCircle, 
  FileSpreadsheet, 
  RefreshCw, 
  User, 
  Trash2, 
  Clock,
  Info,
  Mail,
  Shield,
  Smartphone,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { getDeviceHandler, clearDeviceHandler, DeviceHandler } from "@/lib/handler-memory";
import { testConnection, ConnectionTestResult } from "@/lib/sheets-api";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export function DesktopSettings() {
  const navigate = useNavigate();
  const [deviceHandler, setDeviceHandler] = useState<DeviceHandler | null>(null);
  const [expiryHours, setExpiryHours] = useState<number | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'loading' | 'connected' | 'error'>('loading');
  const [connectionData, setConnectionData] = useState<ConnectionTestResult | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [isTesting, setIsTesting] = useState(false);

  useEffect(() => {
    const handler = getDeviceHandler();
    setDeviceHandler(handler);
    
    if (handler) {
      const setAt = new Date(handler.setAt);
      const expiresAt = new Date(setAt.getTime() + 24 * 60 * 60 * 1000);
      const hoursLeft = Math.max(0, Math.round((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60)));
      setExpiryHours(hoursLeft);
    }
  }, []);

  const runConnectionTest = async () => {
    setIsTesting(true);
    setConnectionStatus('loading');
    setErrorMessage('');
    
    try {
      const result = await testConnection();
      setConnectionData(result);
      setConnectionStatus('connected');
      toast({
        title: "Connection successful",
        description: `Connected to "${result.title}"`,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setErrorMessage(message);
      setConnectionStatus('error');
    } finally {
      setIsTesting(false);
    }
  };

  useEffect(() => {
    runConnectionTest();
  }, []);

  const handleClearDevice = () => {
    clearDeviceHandler();
    setDeviceHandler(null);
    setExpiryHours(null);
    toast({
      title: "Device cleared",
      description: "Handler registration has been removed",
    });
  };

  const handleChangeHandler = () => {
    clearDeviceHandler();
    navigate('/');
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-muted-foreground">Manage your device and connection settings</p>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Device Handler Section */}
          <Card className={deviceHandler ? "border-primary/30" : ""}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCog className="w-5 h-5 text-primary" />
                Device Handler
              </CardTitle>
              <CardDescription>
                {deviceHandler 
                  ? "This device auto-opens your tasks" 
                  : "No handler registered for this device"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {deviceHandler ? (
                <>
                  <div className="bg-muted rounded-lg p-4 flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
                      {deviceHandler.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-lg">{deviceHandler.name}</p>
                      <p className="text-sm text-muted-foreground">
                        Registered {new Date(deviceHandler.setAt).toLocaleDateString()}
                      </p>
                      {expiryHours !== null && expiryHours > 0 && (
                        <div className="flex items-center gap-1 mt-1 text-sm text-amber-500">
                          <Clock className="w-4 h-4" />
                          <span>Resets in ~{expiryHours} hour{expiryHours !== 1 ? 's' : ''}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Button 
                      variant="outline" 
                      className="flex-1"
                      onClick={handleChangeHandler}
                    >
                      <User className="w-4 h-4 mr-2" />
                      Change Handler
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive">
                          <Trash2 className="w-4 h-4 mr-2" />
                          Clear
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Clear Device Registration?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will remove {deviceHandler.name} from this device. 
                            You'll need to select a handler again on next visit.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={handleClearDevice}>Clear</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </>
              ) : (
                <div className="text-center py-6">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                    <User className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground mb-4">
                    No handler registered for this device
                  </p>
                  <Button variant="outline" onClick={() => navigate('/')}>
                    Go to Dashboard
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* App Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="w-5 h-5 text-primary" />
                App Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between py-2">
                <span className="text-muted-foreground">Version</span>
                <Badge variant="secondary">1.0.0</Badge>
              </div>
              <Separator />
              <div className="flex items-center justify-between py-2">
                <span className="text-muted-foreground">PWA Status</span>
                <Badge variant={window.matchMedia('(display-mode: standalone)').matches ? "default" : "outline"}>
                  {window.matchMedia('(display-mode: standalone)').matches ? "Installed" : "Browser Mode"}
                </Badge>
              </div>
              <Separator />
              <div className="flex items-center justify-between py-2">
                <span className="text-muted-foreground">Mode</span>
                <Badge className="bg-primary/10 text-primary border-primary/20">Desktop Mode</Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Connection Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Link2 className="w-5 h-5 text-primary" />
                Connection Status
              </CardTitle>
              <CardDescription>
                Backend connection to Google Sheets
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {connectionStatus === 'loading' && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                </div>
              )}
              
              {connectionStatus === 'connected' && connectionData && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <span className="font-medium text-green-600 dark:text-green-400">Connected Successfully</span>
                  </div>
                  
                  <div className="bg-muted rounded-lg p-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <FileSpreadsheet className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{connectionData.title}</p>
                        <p className="text-xs text-muted-foreground">Spreadsheet</p>
                      </div>
                    </div>
                    <Separator />
                    <div className="flex items-center gap-3">
                      <Shield className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-mono">{connectionData.spreadsheetIdMasked}</p>
                        <p className="text-xs text-muted-foreground">Spreadsheet ID (masked)</p>
                      </div>
                    </div>
                    <Separator />
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">Active Sheets:</p>
                      <div className="flex flex-wrap gap-2">
                        {connectionData.sheets.map(sheet => (
                          <Badge key={sheet} variant="secondary">{sheet}</Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {connectionStatus === 'error' && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-3 bg-destructive/10 border border-destructive/30 rounded-lg">
                    <XCircle className="w-5 h-5 text-destructive" />
                    <span className="font-medium text-destructive">Connection Failed</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{errorMessage}</p>
                </div>
              )}
              
              <Button 
                onClick={runConnectionTest}
                disabled={isTesting}
                className="w-full"
              >
                {isTesting ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-2" />
                )}
                Test Connection
              </Button>
            </CardContent>
          </Card>

          {/* Service Account Info */}
          {connectionStatus === 'connected' && connectionData && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="w-5 h-5 text-primary" />
                  Integration Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-muted rounded-lg p-4">
                  <p className="text-xs text-muted-foreground mb-1">Service Account Email</p>
                  <p className="text-sm font-mono break-all">{connectionData.serviceAccountEmail}</p>
                </div>
                <p className="text-xs text-muted-foreground">
                  This service account needs "Editor" access to your Google Sheet for the integration to work properly.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
