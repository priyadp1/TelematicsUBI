/* eslint-disable */
// this is an auto generated file. This will be overwritten

export const onCreateDriverFeature = /* GraphQL */ `
  subscription OnCreateDriverFeature(
    $filter: ModelSubscriptionDriverFeatureFilterInput
    $owner: String
  ) {
    onCreateDriverFeature(filter: $filter, owner: $owner) {
      id
      driverId
      date
      miles
      trips
      durationH
      speedMean
      speedStd
      harshBrakeRate
      harshAccelRate
      sharpTurnRate
      nightPct
      schoolZonePct
      riskScore
      premium
      updatedAt
      createdAt
      owner
      __typename
    }
  }
`;
export const onUpdateDriverFeature = /* GraphQL */ `
  subscription OnUpdateDriverFeature(
    $filter: ModelSubscriptionDriverFeatureFilterInput
    $owner: String
  ) {
    onUpdateDriverFeature(filter: $filter, owner: $owner) {
      id
      driverId
      date
      miles
      trips
      durationH
      speedMean
      speedStd
      harshBrakeRate
      harshAccelRate
      sharpTurnRate
      nightPct
      schoolZonePct
      riskScore
      premium
      updatedAt
      createdAt
      owner
      __typename
    }
  }
`;
export const onDeleteDriverFeature = /* GraphQL */ `
  subscription OnDeleteDriverFeature(
    $filter: ModelSubscriptionDriverFeatureFilterInput
    $owner: String
  ) {
    onDeleteDriverFeature(filter: $filter, owner: $owner) {
      id
      driverId
      date
      miles
      trips
      durationH
      speedMean
      speedStd
      harshBrakeRate
      harshAccelRate
      sharpTurnRate
      nightPct
      schoolZonePct
      riskScore
      premium
      updatedAt
      createdAt
      owner
      __typename
    }
  }
`;
export const onCreateTripEvent = /* GraphQL */ `
  subscription OnCreateTripEvent(
    $filter: ModelSubscriptionTripEventFilterInput
    $owner: String
  ) {
    onCreateTripEvent(filter: $filter, owner: $owner) {
      id
      driverId
      ts
      speed
      accel
      brake
      lat
      lon
      createdAt
      updatedAt
      owner
      __typename
    }
  }
`;
export const onUpdateTripEvent = /* GraphQL */ `
  subscription OnUpdateTripEvent(
    $filter: ModelSubscriptionTripEventFilterInput
    $owner: String
  ) {
    onUpdateTripEvent(filter: $filter, owner: $owner) {
      id
      driverId
      ts
      speed
      accel
      brake
      lat
      lon
      createdAt
      updatedAt
      owner
      __typename
    }
  }
`;
export const onDeleteTripEvent = /* GraphQL */ `
  subscription OnDeleteTripEvent(
    $filter: ModelSubscriptionTripEventFilterInput
    $owner: String
  ) {
    onDeleteTripEvent(filter: $filter, owner: $owner) {
      id
      driverId
      ts
      speed
      accel
      brake
      lat
      lon
      createdAt
      updatedAt
      owner
      __typename
    }
  }
`;
