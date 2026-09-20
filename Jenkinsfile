// Pipeline-from-SCM: configure the GitHub repository and checkout credentials in Jenkins.
// The Linux agent needs Git, Bash and Docker CLI access to this VPS's Docker daemon.
// Run only trusted repository code: Docker socket access is equivalent to host root.
pipeline {
    agent { label 'docker' }

    options {
        skipDefaultCheckout(true)
        disableConcurrentBuilds()
        timeout(time: 60, unit: 'MINUTES')
        buildDiscarder(logRotator(numToKeepStr: '20', artifactNumToKeepStr: '10'))
        timestamps()
    }

    parameters {
        string(name: 'ORIGIN', defaultValue: '', description: 'Public HTTPS origin, e.g. https://game.example.com; required for deployment.')
        string(name: 'DEPLOY_PROJECT', defaultValue: 'dead-signal', description: 'Stable deployment namespace on this Docker daemon.')
        string(name: 'PROXY_NETWORK', defaultValue: 'npm_proxy', description: 'Existing external Docker network shared with Nginx Proxy Manager.')
        booleanParam(name: 'DEPLOY_ENABLED', defaultValue: false, description: 'Deliberately enable production deployment from main. Never deploys pull requests.')
    }

    stages {
        stage('Checkout') {
            steps {
                deleteDir()
                script {
                    def checkoutResult = checkout scm
                    def commit = checkoutResult.GIT_COMMIT
                    if (!commit || !(commit ==~ /[0-9a-fA-F]{40,64}/)) {
                        error('SCM checkout did not return a full Git commit hash.')
                    }
                    def uniqueToken = sh(script: 'cat /proc/sys/kernel/random/uuid', returnStdout: true).trim().replace('-', '').take(16)
                    env.RELEASE_ID = "${commit.take(12).toLowerCase()}-${env.BUILD_NUMBER}-${uniqueToken}"
                    env.APP_IMAGE = "dead-signal-app:${env.RELEASE_ID}"
                    env.CI_IMAGE = "dead-signal-ci:${env.RELEASE_ID}"
                    env.CHECK_CONTAINER = "dead-signal-checks-${env.RELEASE_ID}"
                    env.SMOKE_CONTAINER = "dead-signal-smoke-${env.RELEASE_ID}"
                    env.SMOKE_APP = "dead-signal-app-${env.RELEASE_ID}"
                    env.SMOKE_NETWORK = "dead-signal-smoke-${env.RELEASE_ID}"
                    def branch = env.BRANCH_NAME ?: checkoutResult.GIT_BRANCH
                    def mainBranch = env.BRANCH_NAME ? branch == 'main' :
                        branch in ['main', 'origin/main', 'refs/heads/main', 'refs/remotes/origin/main']
                    env.TRUSTED_MAIN = (!env.CHANGE_ID && mainBranch).toString()
                }
            }
        }

        stage('Build CI image') {
            steps {
                sh '''#!/usr/bin/env bash
set -euo pipefail
docker build --file ci/Dockerfile --tag "$CI_IMAGE" .
'''
            }
        }

        stage('Check, lint, audit and unit tests') {
            steps {
                sh '''#!/usr/bin/env bash
set -euo pipefail
docker run --name "$CHECK_CONTAINER" --label "ci.build-token=$RELEASE_ID" \
    --label ci.reports=checks --shm-size=1g "$CI_IMAGE" bash ci/check.sh
'''
            }
        }

        stage('Build production image') {
            steps {
                sh '''#!/usr/bin/env bash
set -euo pipefail
docker build --file Dockerfile --tag "$APP_IMAGE" .
'''
            }
        }

        stage('Smoke production image') {
            steps {
                sh '''#!/usr/bin/env bash
set -euo pipefail
docker network create --internal --label "ci.build-token=$RELEASE_ID" "$SMOKE_NETWORK"
docker run --detach --name "$SMOKE_APP" --label "ci.build-token=$RELEASE_ID" \
    --network "$SMOKE_NETWORK" --network-alias app \
    --env ORIGIN=http://app:3000 --health-interval=2s --health-start-period=5s \
    --health-retries=15 "$APP_IMAGE"
for attempt in {1..60}; do
    health=$(docker inspect --format '{{.State.Health.Status}}' "$SMOKE_APP")
    case "$health" in
        healthy) break ;;
        unhealthy) docker logs "$SMOKE_APP"; exit 1 ;;
    esac
    if [ "$attempt" -eq 60 ]; then
        docker logs "$SMOKE_APP"
        echo 'Production image did not become healthy within 120 seconds.' >&2
        exit 1
    fi
    sleep 2
done
docker run --name "$SMOKE_CONTAINER" --label "ci.build-token=$RELEASE_ID" \
    --label ci.reports=image-smoke --network "$SMOKE_NETWORK" --shm-size=1g \
    --env CI=true --env PLAYWRIGHT_BASE_URL=http://app:3000 \
    "$CI_IMAGE" bun x playwright test
'''
            }
        }

        stage('Deploy main') {
            when {
                allOf {
                    expression { params.DEPLOY_ENABLED }
                    expression { env.TRUSTED_MAIN == 'true' }
                    not { changeRequest() }
                }
            }
            steps {
                withEnv([
                    "ORIGIN=${params.ORIGIN}",
                    "DEPLOY_PROJECT=${params.DEPLOY_PROJECT}",
                    "PROXY_NETWORK=${params.PROXY_NETWORK}",
                    'REPORT_DIR=reports/deploy'
                ]) {
                    sh '''#!/usr/bin/env bash
set -euo pipefail
bash deploy/deploy.sh
'''
                }
            }
        }
    }

    post {
        always {
            script {
                try {
                    if (env.RELEASE_ID) {
                        sh '''#!/usr/bin/env bash
set -euo pipefail
containers=$(docker container ls --all --filter "label=ci.build-token=$RELEASE_ID" \
    --filter label=ci.reports --format '{{.Names}}')
for container in $containers; do
    report_name=$(docker inspect --format '{{index .Config.Labels "ci.reports"}}' "$container")
    mkdir -p "reports/$report_name/test-results"
    docker cp "$container:/app/reports/." "reports/$report_name/"
    docker cp "$container:/app/test-results/." "reports/$report_name/test-results/"
done
'''
                    }
                } finally {
                    try {
                        if (fileExists('reports')) {
                            try {
                                junit(testResults: 'reports/**/*.xml', allowEmptyResults: true)
                            } finally {
                                archiveArtifacts(artifacts: 'reports/**', allowEmptyArchive: true)
                            }
                        }
                    } finally {
                        if (env.RELEASE_ID) {
                            sh '''#!/usr/bin/env bash
set -euo pipefail
containers=$(docker container ls --all --quiet --filter "label=ci.build-token=$RELEASE_ID")
for container in $containers; do
    docker container rm --force "$container"
done
networks=$(docker network ls --quiet --filter "label=ci.build-token=$RELEASE_ID")
for network in $networks; do
    docker network rm "$network"
done
ci_image_id=$(docker image ls --quiet "$CI_IMAGE")
if [ -n "$ci_image_id" ]; then
    docker image rm "$CI_IMAGE"
fi
app_image_id=$(docker image ls --quiet "$APP_IMAGE")
if [ -n "$app_image_id" ]; then
    references=$(docker container ls --all --quiet --filter "ancestor=$APP_IMAGE")
    if [ -z "$references" ]; then
        docker image rm "$APP_IMAGE"
    fi
fi
'''
                        }
                    }
                }
            }
        }
    }
}
