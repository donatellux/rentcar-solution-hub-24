import * as React from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface MobileTableProps {
  children: React.ReactNode
  className?: string
}

interface MobileReservationCardProps {
  reservation: {
    id: string
    clients?: {
      nom: string
      prenom: string
      telephone: string
    } | null
    vehicles?: {
      marque: string
      modele: string
      immatriculation: string
    } | null
    date_debut: string | null
    date_fin: string | null
    statut: string | null
  }
  onEdit: () => void
  onContract: () => void
  generatingPDF?: boolean
  className?: string
}

const MobileTable = React.forwardRef<
  HTMLDivElement,
  MobileTableProps
>(({ className, children, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("lg:hidden space-y-3 p-4", className)}
    {...props}
  >
    {children}
  </div>
))
MobileTable.displayName = "MobileTable"

const MobileReservationCard = React.forwardRef<
  HTMLDivElement,
  MobileReservationCardProps
>(({ className, reservation, onEdit, onContract, generatingPDF, ...props }, ref) => (
  <Card ref={ref} className={cn("", className)} {...props}>
    <CardContent className="p-4 space-y-3">
      {/* Client Info */}
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-medium text-foreground">
            {reservation.clients?.prenom} {reservation.clients?.nom}
          </h3>
          <p className="text-sm text-muted-foreground">
            {reservation.clients?.telephone}
          </p>
        </div>
        <Badge 
          variant={reservation.statut === 'confirmee' ? 'default' : 
                  reservation.statut === 'terminee' ? 'secondary' :
                  reservation.statut === 'annulee' ? 'destructive' : 'outline'}
          className="text-xs"
        >
          {reservation.statut === 'confirmee' ? 'Terminée' :
           reservation.statut === 'en_cours' ? 'En cours' :
           reservation.statut === 'terminee' ? 'Terminée' :
           reservation.statut === 'annulee' ? 'Annulée' : 'En attente'}
        </Badge>
      </div>

      {/* Vehicle Info */}
      <div className="border-t border-border pt-3">
        <p className="font-medium text-sm">
          {reservation.vehicles?.marque} {reservation.vehicles?.modele}
        </p>
        <p className="text-sm text-muted-foreground">
          {reservation.vehicles?.immatriculation}
        </p>
      </div>

      {/* Date Range */}
      <div className="border-t border-border pt-3">
        <div className="text-sm">
          {reservation.date_debut && reservation.date_fin ? (
            <>
              <div>{new Date(reservation.date_debut).toLocaleDateString('fr-FR')}</div>
              <div className="text-muted-foreground">au {new Date(reservation.date_fin).toLocaleDateString('fr-FR')}</div>
            </>
          ) : (
            'Dates non définies'
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-2">
        <Button
          size="sm"
          variant="outline"
          onClick={onEdit}
          className="flex-1"
        >
          Modifier
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={onContract}
          disabled={generatingPDF}
          className="flex-1"
        >
          {generatingPDF ? 'Génération...' : 'Contrat'}
        </Button>
      </div>
    </CardContent>
  </Card>
))
MobileReservationCard.displayName = "MobileReservationCard"

export {
  MobileTable,
  MobileReservationCard,
}